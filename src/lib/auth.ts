/**
 * Authentication and authorisation.
 *
 * Design review §14: Argon2id password hashing, database-backed sessions that
 * can be revoked individually, permissions re-derived on the server for every
 * request, and login attempts recorded for rate limiting.
 */
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@/db";
import { loginAttempts, permissions, rolePermissions, roles, sessions, users } from "@/db/schema";
import { clientAddress } from "./request";

export const SESSION_COOKIE = "cgzsa_session";
const IDLE_MINUTES = 30;
const ABSOLUTE_HOURS = 12;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;

/* ─────────────────────────────── passwords */

// Argon2id with parameters at the OWASP-recommended floor.
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string) {
  return hash(plain, ARGON_OPTS);
}

export async function verifyPassword(storedHash: string, plain: string) {
  try {
    return await verify(storedHash, plain, ARGON_OPTS);
  } catch {
    return false;
  }
}

export function passwordProblems(plain: string): string[] {
  const out: string[] = [];
  if (plain.length < 12) out.push("Use at least 12 characters.");
  if (/^(.)\1+$/.test(plain)) out.push("Do not repeat a single character.");
  const common = ["password", "12345678", "qwerty", "letmein", "cgzsa", "liberia"];
  if (common.some((c) => plain.toLowerCase().includes(c)))
    out.push("This contains a word that is easy to guess.");
  return out;
}

/* ─────────────────────────────── sessions */

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string, ip?: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ABSOLUTE_HOURS * 3600_000);
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Revoke every session belonging to a user. Used when an account is suspended
 *  or its password is reset by somebody else. To keep the caller's own session,
 *  use revokeOtherSessions() in admin/account/actions.ts, which excludes it. */
export async function revokeAllSessions(userId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  rank: number;
  permissions: Set<string>;
};

/** Resolve the signed-in user, or null. Never trusts anything the client sends. */
export async function getActor(): Promise<Actor | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const idleFloor = new Date(now.getTime() - IDLE_MINUTES * 60_000);

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      roleName: roles.name,
      roleLabel: roles.label,
      rank: roles.rank,
      lastSeen: sessions.lastSeen,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        gte(sessions.lastSeen, idleFloor),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.status !== "ACTIVE") return null;

  // One UPDATE per authenticated request is a write transaction and table bloat
  // on every admin page view. The idle timeout has a thirty-minute granularity,
  // so refreshing at most once a minute preserves it exactly while removing most
  // of the writes.
  if (now.getTime() - row.lastSeen.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeen: now }).where(eq(sessions.id, row.sessionId));
  }

  const perms = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
    .where(eq(roles.name, row.roleName));

  return {
    id: row.userId,
    name: row.name,
    email: row.email,
    role: row.roleName,
    roleLabel: row.roleLabel,
    rank: row.rank,
    permissions: new Set(perms.map((p) => p.key)),
  };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AuthError("Not signed in");
  return actor;
}

/** The server-side gate. The interface hides what a user cannot do; this refuses it. */
export async function requirePermission(key: string): Promise<Actor> {
  const actor = await requireActor();
  if (!actor.permissions.has(key)) throw new AuthError(`Missing permission: ${key}`);
  return actor;
}

export function can(actor: Actor | null, key: string) {
  return !!actor?.permissions.has(key);
}

export class AuthError extends Error {}

/* ─────────────────────────────── rate limiting */

export async function recordAttempt(email: string, ip: string | undefined, success: boolean, reason?: string) {
  await db.insert(loginAttempts).values({ email: email.toLowerCase(), ip: ip ?? null, success, reason: reason ?? null });
}

/**
 * Discard the failure history for an account after it signs in successfully.
 *
 * Without this, five deliberate failures against a known address kept that
 * account locked for fifteen minutes, and repeating them kept it locked
 * indefinitely — a denial of service costing an attacker five requests. The
 * address dimension of the limit is untouched, so brute force is still capped.
 */
export async function clearAttempts(email: string) {
  await db
    .delete(loginAttempts)
    .where(and(eq(loginAttempts.email, email.toLowerCase()), eq(loginAttempts.success, false)));
}

export async function tooManyAttempts(email: string, ip?: string) {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.success, false),
        gte(loginAttempts.createdAt, since),
        sql`(${loginAttempts.email} = ${email.toLowerCase()} or ${loginAttempts.ip} = ${ip ?? "-"})`,
      ),
    );
  return (row?.n ?? 0) >= MAX_ATTEMPTS;
}

export async function requestContext() {
  const h = await headers();
  return {
    // Counted from the trusted end of the forwarded chain, not the leftmost
    // value the client can write. See src/lib/request.ts.
    ip: clientAddress(h) ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

/* ─────────────────────────────── recent sessions, for the settings screen */

export async function listSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .orderBy(desc(sessions.lastSeen))
    .limit(10);
}
