import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatVisitors, conversations } from "@/db/schema";

/**
 * The visitor's opaque identity cookie, and the ownership check that the chat
 * routes share.
 *
 * The cookie name previously lived inside the message route and the other two
 * chat routes did not consult it at all, which is how both chat IDOR flaws
 * arose. Keeping the name and the check together means a new chat endpoint has
 * one obvious right way to establish who is calling.
 */
export const VISITOR_COOKIE = "cgzsa_visitor";

export type Visitor = { id: string; blocked: boolean };

/** The visitor this cookie identifies, or null. Creates nothing. */
export async function visitorFromCookie(anonymousId: string | undefined): Promise<Visitor | null> {
  if (!anonymousId) return null;
  const [row] = await db
    .select({ id: chatVisitors.id, blocked: chatVisitors.blocked })
    .from(chatVisitors)
    .where(eq(chatVisitors.anonymousId, anonymousId))
    .limit(1);
  return row ?? null;
}

/**
 * The conversation, only if it belongs to this visitor. One query with both
 * predicates, so a conversation id alone is never enough to reach a row.
 */
export async function ownedConversation(visitorId: string, conversationId: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.visitorId, visitorId)))
    .limit(1);
  return row ?? null;
}
