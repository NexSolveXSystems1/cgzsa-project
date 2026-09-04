import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { Actor } from "./auth";
import { requestContext } from "./auth";

/**
 * Append-only record of administrative activity (design review §14).
 * Passwords, tokens and session identifiers are never written here.
 */
export async function audit(
  actor: Actor | null,
  action: string,
  resource: string,
  detail?: string,
) {
  const { ip, userAgent } = await requestContext();
  await db.insert(auditLogs).values({
    actorId: actor?.id ?? null,
    actorLabel: actor ? `${actor.name} · ${actor.roleLabel}` : "anonymous",
    action,
    resource,
    detail: detail ?? null,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
  });
}

export const ACTIONS = {
  loginSuccess: "auth.login.success",
  loginFailed: "auth.login.failed",
  logout: "auth.logout",
  contentCreate: "content.create",
  contentUpdate: "content.update",
  contentPublish: "content.publish",
  contentDelete: "content.delete",
  settingsUpdate: "settings.update",
  chatClaim: "chat.claim",
  chatReply: "chat.reply",
  chatClose: "chat.close",
  chatExport: "chat.export",
  assistantUpdate: "assistant.update",
  knowledgeReindex: "knowledge.reindex",
  userInvite: "user.invite",
  roleAssign: "user.role.assign",
} as const;
