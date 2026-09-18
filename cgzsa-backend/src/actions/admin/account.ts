"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  hashPassword, passwordProblems, requireActionActor, verifyPassword, SESSION_COOKIE,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { newSecret, verifyTotp } from "@/lib/totp";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** The hash of the session this request is being made with, if any. */
async function currentSessionHash(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}

/**
 * Revoke every session for a user except the one making the request.
 *
 * The predicate previously used was ne(sessions.id, ""), which is true for every
 * row — so "end all other sessions" ended the current one too and signed the
 * user out, and the same defect sat in an unused helper in lib/auth.ts.
 */
async function revokeOthers(userId: string, keepHash: string | null) {
  const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
  if (keepHash) conditions.push(ne(sessions.tokenHash, keepHash));
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(...conditions));
}

export async function beginTotpEnrolment(formData?: FormData) {
  const actor = await requireActionActor();

  const [row] = await db
    .select({ enabled: users.totpEnabled, hash: users.passwordHash })
    .from(users)
    .where(eq(users.id, actor.id));

  // Re-enrolling while two-factor is already active replaced the live secret
  // immediately, so an abandoned setup left the authenticator app producing
  // codes for a secret the database no longer held — a lockout with no
  // self-service recovery. Confirm it is really them before rotating.
  if (row?.enabled) {
    const current = String(formData?.get("current") ?? "");
    if (!row.hash || !(await verifyPassword(row.hash, current))) {
      return { error: "Enter your current password to set up a new authenticator." };
    }
  }

  const secret = newSecret();
  // Stored but not enabled until a valid code proves the app is set up.
  await db.update(users).set({ totpSecret: secret }).where(eq(users.id, actor.id));
  return { secret };
}

export async function confirmTotp(formData: FormData) {
  const actor = await requireActionActor();
  const token = String(formData.get("token") ?? "");
  const [row] = await db.select({ secret: users.totpSecret }).from(users).where(eq(users.id, actor.id));
  if (!row?.secret) return { error: "Start the setup again." };

  const result = verifyTotp(row.secret, token);
  if (!result.ok) return { error: "That code was not accepted. Check the clock on your phone and try again." };

  await db
    .update(users)
    .set({ totpEnabled: true, totpLastStep: result.step })
    .where(eq(users.id, actor.id));
  await audit(actor, "auth.2fa.enable", `user:${actor.id}`, "TOTP enrolled");
  revalidatePath("/admin/account");
  return { ok: true };
}

export async function disableTotp(formData: FormData) {
  const actor = await requireActionActor();

  // Removing the second factor is the one action that undoes every other
  // protection on the account, so it needs the password and a live code.
  // Previously a session alone was enough, which meant anyone who obtained a
  // session could strip 2FA and hold the account with the password.
  const current = String(formData.get("current") ?? "");
  const token = String(formData.get("token") ?? "");

  const [row] = await db
    .select({ hash: users.passwordHash, secret: users.totpSecret, enabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, actor.id));

  if (!row?.hash || !(await verifyPassword(row.hash, current))) {
    return { error: "That is not your current password." };
  }
  if (row.enabled && row.secret) {
    const result = verifyTotp(row.secret, token);
    if (!result.ok) return { error: "Enter a current code from your authenticator app." };
  }

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null, totpLastStep: null })
    .where(eq(users.id, actor.id));
  await audit(actor, "auth.2fa.disable", `user:${actor.id}`, "TOTP removed");
  revalidatePath("/admin/account");
  return { ok: true };
}

export async function changePassword(formData: FormData) {
  const actor = await requireActionActor();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, actor.id));
  if (!row?.hash || !(await verifyPassword(row.hash, current))) {
    return { error: "That is not your current password." };
  }
  const problems = passwordProblems(next);
  if (problems.length) return { error: problems[0] };
  if (await verifyPassword(row.hash, next)) {
    return { error: "Choose a password you have not used here before." };
  }

  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, actor.id));

  // Changing a password is what somebody does when they think an account has
  // been compromised. Leaving the other sessions alive for the rest of their
  // twelve hours defeats the point, and the reset-by-link flow already does this.
  await revokeOthers(actor.id, await currentSessionHash());

  await audit(actor, "auth.password.change", `user:${actor.id}`, "Password changed; other sessions ended");
  revalidatePath("/admin/account");
  return { ok: true };
}

export async function revokeOtherSessions() {
  const actor = await requireActionActor();
  await revokeOthers(actor.id, await currentSessionHash());
  await audit(actor, "auth.sessions.revoke", `user:${actor.id}`, "All other sessions ended");
  revalidatePath("/admin/account");
  return { ok: true };
}
