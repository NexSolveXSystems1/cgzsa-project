"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessages, conversations, users, roles } from "@/db/schema";
import {
  AuthError, clearAttempts, createSession, destroySession, getActor, recordAttempt,
  requestContext, requireActionPermission, requireSameOrigin, tooManyAttempts, verifyPassword,
} from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { publish } from "@/lib/chat-bus";
import { verifyTotp } from "@/lib/totp";

const Credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
  token: z.string().max(10).optional(),
});

export async function signIn(_prev: unknown, formData: FormData) {
  await requireSameOrigin();
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    token: formData.get("token") ?? undefined,
  });
  if (!parsed.success) return { error: "Enter your email address and password." };

  const { email, password } = parsed.data;
  const { ip, userAgent } = await requestContext();

  if (await tooManyAttempts(email, ip)) {
    await recordAttempt(email, ip, false, "rate_limited");
    return { error: "Too many attempts. Please wait fifteen minutes and try again." };
  }

  const [row] = await db
    .select({
      id: users.id, name: users.name, hash: users.passwordHash, status: users.status,
      role: roles.name, totpEnabled: users.totpEnabled, totpSecret: users.totpSecret,
      totpLastStep: users.totpLastStep,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.email, email.toLowerCase()));

  // The same message whether the account exists or the password is wrong.
  const generic = { error: "Those details were not recognised." };

  if (!row?.hash || row.status !== "ACTIVE") {
    await recordAttempt(email, ip, false, "unknown_or_inactive");
    return generic;
  }
  if (!(await verifyPassword(row.hash, password))) {
    await recordAttempt(email, ip, false, "bad_password");
    await audit(null, ACTIONS.loginFailed, `user:${email}`, "Wrong password");
    return generic;
  }

  // Second factor, once enrolled.
  if (row.totpEnabled && row.totpSecret) {
    if (!parsed.data.token) {
      return { needsToken: true as const };
    }
    // lastStep makes a replayed code fail: without it the same code was valid
    // for the full ninety seconds of the drift window, so one observed code plus
    // a known password was enough to sign in again.
    const totp = verifyTotp(row.totpSecret, parsed.data.token, { lastStep: row.totpLastStep });
    if (!totp.ok) {
      await recordAttempt(email, ip, false, "bad_totp");
      await audit(null, ACTIONS.loginFailed, `user:${email}`, "Wrong or reused two-factor code");
      return { needsToken: true as const, error: "That code was not accepted." };
    }
    await db.update(users).set({ totpLastStep: totp.step }).where(eq(users.id, row.id));
  }

  await recordAttempt(email, ip, true);
  // A successful sign-in clears the failure history for this account, so an
  // attacker cannot keep a known address locked out indefinitely by failing
  // five times every fifteen minutes.
  await clearAttempts(email);
  await createSession(row.id, ip, userAgent);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));
  const actor = await getActor();
  await audit(actor, ACTIONS.loginSuccess, `user:${row.id}`, "Signed in");
  redirect("/admin/dashboard");
}

export async function signOut() {
  await requireSameOrigin();
  const actor = await getActor();
  if (actor) await audit(actor, ACTIONS.logout, `user:${actor.id}`, "Signed out");
  await destroySession();
  redirect("/admin");
}

/* ─────────────────────────── live chat */

export async function claimConversation(conversationId: string) {
  const actor = await requireActionPermission("chat.answer");
  await db
    .update(conversations)
    .set({ status: "ASSIGNED", assignedToId: actor.id })
    .where(eq(conversations.id, conversationId));
  await db.insert(chatMessages).values({
    conversationId,
    author: "SYSTEM",
    body: "A member of the team has joined.",
  });
  await publish(conversationId, {
    id: `sys-${Date.now()}`,
    author: "SYSTEM",
    body: "A member of the team has joined.",
  });
  await audit(actor, ACTIONS.chatClaim, `conversation:${conversationId}`, "Claimed");
  revalidatePath("/admin/chat");
}

export async function replyToConversation(conversationId: string, formData: FormData) {
  const actor = await requireActionPermission("chat.answer");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!body) return;

  const [convo] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!convo) throw new AuthError("No such conversation");
  if (convo.assignedToId && convo.assignedToId !== actor.id) {
    throw new AuthError("This conversation is assigned to somebody else");
  }

  const [saved] = await db
    .insert(chatMessages)
    .values({ conversationId, author: "STAFF", staffId: actor.id, body })
    .returning();

  await db
    .update(conversations)
    .set({ status: "ASSIGNED", assignedToId: actor.id, lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // This is what reaches the visitor's browser over the SSE stream.
  await publish(conversationId, { id: saved.id, author: "STAFF", body, staffName: actor.name });
  await audit(actor, ACTIONS.chatReply, `conversation:${conversationId}`, `${body.length} characters`);
  revalidatePath("/admin/chat");
}

export async function closeConversation(conversationId: string) {
  const actor = await requireActionPermission("chat.close");
  await db
    .update(conversations)
    .set({ status: "CLOSED", closedAt: new Date() })
    .where(and(eq(conversations.id, conversationId)));
  await audit(actor, ACTIONS.chatClose, `conversation:${conversationId}`, "Closed");
  revalidatePath("/admin/chat");
}
