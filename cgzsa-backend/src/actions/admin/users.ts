"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, roles, users } from "@/db/schema";
import { hashPassword, passwordProblems, requireActionPermission, revokeAllSessions, type Actor } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { sendMail } from "@/lib/email";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const INVITE_HOURS = 72;
const SUPER_ADMIN_LIMIT = 2;

const Invite = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  name: z.string().trim().min(2, "Enter a name.").max(160),
  roleId: z.string().min(1, "Choose a role."),
});

/**
 * The target of an administrative action, with the rank comparison that stops a
 * user modifying an account at or above their own level.
 *
 * There was no rank check on any of these actions. Only Super Administrator
 * currently holds users.manage, so there was no exploitable escalation today —
 * but the role matrix is editable data, and the day somebody grants users.manage
 * to Administrator, an Administrator can set a Super Administrator's password and
 * sign in as them. The guard belongs here, not in the role matrix.
 */
async function targetFor(actorRank: number, userId: string) {
  const [row] = await db
    .select({ id: users.id, name: users.name, roleId: users.roleId, roleName: roles.name, rank: roles.rank })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return { error: "That account no longer exists." } as const;
  if (row.rank >= actorRank) {
    return { error: "You cannot change an account at or above your own level." } as const;
  }
  return { target: row } as const;
}

async function superAdminCount(excludeUserId?: string) {
  const conditions = [eq(roles.name, "SUPER_ADMIN"), isNull(users.deletedAt)];
  if (excludeUserId) conditions.push(ne(users.id, excludeUserId));
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(...conditions));
  return row?.n ?? 0;
}

async function grantGuard(
  actor: Actor,
  role: { name: string; rank: number; label: string },
  targetUserId?: string,
) {
  if (role.name === "SUPER_ADMIN") {
    if (actor.role !== "SUPER_ADMIN") {
      return { error: "Only a Super Administrator can create another Super Administrator." } as const;
    }
    if ((await superAdminCount(targetUserId)) >= SUPER_ADMIN_LIMIT) {
      return { error: `Only ${SUPER_ADMIN_LIMIT} Super Administrator accounts are allowed.` } as const;
    }
    return null;
  }

  if (role.rank >= actor.rank) {
    return { error: "You cannot grant a role at or above your own level." } as const;
  }

  return null;
}

export async function inviteUser(formData: FormData) {
  const actor = await requireActionPermission("users.manage");
  const parsed = Invite.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, name, roleId } = parsed.data;

  const [role] = await db
    .select({ id: roles.id, name: roles.name, rank: roles.rank, label: roles.label })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!role) return { error: "Choose a role." };
  const grantError = await grantGuard(actor, role);
  if (grantError) return grantError;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) return { error: "There is already an account with that address." };

  const [created] = await db.insert(users)
    .values({ email: email.toLowerCase(), name, roleId, status: "INVITED" })
    .returning({ id: users.id });

  // An invitation used to be a database row and nothing else: no password, no
  // email, and sign-in refuses any account that is not ACTIVE — so an invited
  // person could never get in. The link below reuses the password-reset flow,
  // which already sets a password and activates the account.
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({
    tokenHash: sha256(token),
    userId: created.id,
    expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000),
  });

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const mail = await sendMail({
    to: email,
    subject: "Your CGZSA content system account",
    text: [
      `Hello ${name},`, "",
      `You have been given a ${role.label} account on the CGZSA content system.`,
      "Choose a password using the link below within three days:",
      "", `${base}/admin/reset/${token}`, "",
      "If you were not expecting this, ignore this message and the invitation will lapse.",
    ].join("\n"),
  });

  await audit(actor, ACTIONS.userInvite, `user:${created.id}`, `${email} invited as ${role.label}`);
  revalidatePath("/admin/users");

  return mail.sent
    ? { ok: true, message: `Invitation sent to ${email}.` }
    : {
        ok: true,
        // Told plainly rather than silently: without SMTP the link exists but
        // nobody has received it, and the administrator needs to know that.
        message:
          `Account created, but email is not configured so no invitation was sent. ` +
          `Set a temporary password for ${email} and pass it on directly.`,
      };
}

export async function changeRole(userId: string, roleId: string) {
  const actor = await requireActionPermission("users.manage");
  if (userId === actor.id) return { error: "You cannot change your own role." };

  const found = await targetFor(actor.rank, userId);
  if ("error" in found) return found;

  const [after] = await db
    .select({ label: roles.label, name: roles.name, rank: roles.rank })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!after) return { error: "That role does not exist." };
  const grantError = await grantGuard(actor, after, userId);
  if (grantError) return grantError;

  const [before] = await db.select({ label: roles.label }).from(roles).where(eq(roles.id, found.target.roleId));

  await db.update(users).set({ roleId }).where(eq(users.id, userId));
  await audit(actor, ACTIONS.roleAssign, `user:${userId}`, `${found.target.name}: ${before?.label} → ${after.label}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
  const actor = await requireActionPermission("users.manage");
  if (userId === actor.id) return { error: "You cannot suspend your own account." };

  const found = await targetFor(actor.rank, userId);
  if ("error" in found) return found;

  await db.update(users).set({ status }).where(eq(users.id, userId));
  // Suspending must end the person's access immediately, not at the next expiry.
  if (status === "SUSPENDED") await revokeAllSessions(userId);

  await audit(actor, "user.status", `user:${userId}`, status);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setTemporaryPassword(userId: string, formData: FormData) {
  const actor = await requireActionPermission("users.manage");
  const found = await targetFor(actor.rank, userId);
  if ("error" in found) return found;

  const pw = String(formData.get("password") ?? "");
  const problems = passwordProblems(pw);
  if (problems.length) return { error: problems[0] };

  await db.update(users).set({ passwordHash: await hashPassword(pw), status: "ACTIVE" }).where(eq(users.id, userId));

  // Every session the other person holds ends now. The previous predicate was
  // and(eq(sessions.userId, userId), ne(sessions.userId, actor.id)) — comparing
  // the session's user to the actor rather than excluding the actor's own
  // session, which is not what either clause was trying to express.
  await revokeAllSessions(userId);

  await audit(actor, "user.password.set", `user:${userId}`, "Temporary password set by an administrator");
  revalidatePath("/admin/users");
  return { ok: true };
}
