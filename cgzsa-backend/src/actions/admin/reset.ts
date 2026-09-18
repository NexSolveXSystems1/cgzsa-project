"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { hashPassword, passwordProblems, requestContext, requireSameOrigin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function requestReset(formData: FormData) {
  await requireSameOrigin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { ip } = await requestContext();

  if (!rateLimit(`reset:${ip}`, 5, 900_000).ok) {
    return { ok: true as const }; // do not reveal that a limit was hit
  }

  const [user] = await db.select({ id: users.id, name: users.name }).from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)));

  // Always the same answer, whether or not the account exists.
  if (user) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(passwordResets).values({ tokenHash: sha256(token), userId: user.id, expiresAt });
    const base = process.env.APP_URL ?? "http://localhost:3000";
    await sendMail({
      to: email,
      subject: "Reset your CGZSA content system password",
      text: [
        `Hello ${user.name},`, "",
        "Someone asked to reset the password on your CGZSA account. If that was you, open the link below within one hour:",
        "", `${base}/admin/reset/${token}`, "",
        "If it was not you, ignore this message. Your password has not changed.",
      ].join("\n"),
    });
    await audit(null, "auth.password.reset_requested", `user:${user.id}`, "Reset link issued");
  }

  return { ok: true as const };
}

export async function completeReset(token: string, formData: FormData) {
  await requireSameOrigin();
  const password = String(formData.get("password") ?? "");
  const problems = passwordProblems(password);
  if (problems.length) return { error: problems[0] };

  const [row] = await db.select().from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256(token)), gt(passwordResets.expiresAt, new Date()), isNull(passwordResets.usedAt)))
    .limit(1);
  if (!row) return { error: "That link has expired or has already been used. Ask for a new one." };

  await db.update(users).set({ passwordHash: await hashPassword(password), status: "ACTIVE" }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
  // Any session opened with the old password ends now.
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, row.userId));
  await audit(null, "auth.password.reset", `user:${row.userId}`, "Password reset by link");
  return { ok: true as const };
}
