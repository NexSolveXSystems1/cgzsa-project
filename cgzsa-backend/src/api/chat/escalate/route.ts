import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessages, chatVisitors, contactMessages, conversations } from "@/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { insertWithReference } from "@/lib/format";
import { clientAddress, rateLimitKey } from "@/lib/request";
import { VISITOR_COOKIE } from "@/lib/chat-visitor";
import { logger } from "@/lib/log";

const log = logger("chat.escalate");

export const runtime = "nodejs";

const Body = z.object({
  conversationId: z.string().min(1).max(64),
  email: z.string().email().max(200),
});

/**
 * Takes an email address and turns the conversation into a contact message.
 *
 * The conversation is looked up by id AND by the visitor the caller's cookie
 * identifies. Without that second condition — as this route was originally
 * written — anyone holding a conversation id could attach their own address to
 * somebody else's conversation, receive the staff reply, and force a contact
 * message containing that visitor's full transcript. A missing or mismatched
 * cookie yields 404 rather than 403, so the endpoint does not confirm which
 * conversation ids exist.
 */
export async function POST(req: Request) {
  const h = await headers();
  const ip = clientAddress(h);
  if (!rateLimit(rateLimitKey("escalate", ip), 5, 300_000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const notFound = NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const jar = await cookies();
  const anonymousId = jar.get(VISITOR_COOKIE)?.value;
  if (!anonymousId) return notFound;

  const [visitor] = await db
    .select({ id: chatVisitors.id, blocked: chatVisitors.blocked })
    .from(chatVisitors)
    .where(eq(chatVisitors.anonymousId, anonymousId))
    .limit(1);
  if (!visitor) return notFound;
  if (visitor.blocked) {
    return NextResponse.json({ error: "This conversation has been closed." }, { status: 403 });
  }

  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, parsed.data.conversationId), eq(conversations.visitorId, visitor.id)))
    .limit(1);
  if (!convo) return notFound;

  await db
    .update(chatVisitors)
    .set({ email: parsed.data.email, consented: true })
    .where(eq(chatVisitors.id, visitor.id));

  const history = await db
    .select({ author: chatMessages.author, body: chatMessages.body })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, convo.id))
    .orderBy(chatMessages.createdAt);

  const transcript = history
    .map((m) => `${m.author === "VISITOR" ? "Visitor" : m.author === "ASSISTANT" ? "Assistant" : "Staff"}: ${m.body}`)
    .join("\n");

  let ref: string;
  try {
    ({ ref } = await insertWithReference("MSG", (candidate) =>
      db.insert(contactMessages).values({
        reference: candidate,
        name: "Website visitor",
        email: parsed.data.email,
        subject: convo.subject ?? "Question from live chat",
        body: transcript,
        source: "live_chat",
        conversationId: convo.id,
        ip,
      }),
    ));
  } catch (err) {
    log.error("could not create the contact message", { err });
    return NextResponse.json(
      { error: "We could not pass this to the team. Please try again." },
      { status: 503 },
    );
  }

  await db
    .update(conversations)
    .set({ status: "ESCALATED", lastMessageAt: new Date() })
    .where(eq(conversations.id, convo.id));

  await db.insert(chatMessages).values({
    conversationId: convo.id,
    author: "SYSTEM",
    body: `Visitor left ${parsed.data.email}. Contact message ${ref} created.`,
  });

  return NextResponse.json({ ok: true, reference: ref });
}
