import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessages, chatVisitors, conversations, unansweredQuestions } from "@/db/schema";
import { ask } from "@/lib/assistant";
import { getAssistantSettings, officeIsOpen } from "@/lib/settings";
import { rateLimit } from "@/lib/ratelimit";
import { publish } from "@/lib/chat-bus";
import { insertWithReference } from "@/lib/format";
import { clientAddress, rateLimitKey } from "@/lib/request";
import { VISITOR_COOKIE } from "@/lib/chat-visitor";
import { priceUsd, recordSpend } from "@/lib/assistant-cost";
import { logger } from "@/lib/log";

const log = logger("chat.message");

export const runtime = "nodejs";

const Body = z.object({
  conversationId: z.string().max(64).nullable().optional(),
  body: z.string().trim().min(1).max(2000),
  path: z.string().max(300).optional(),
});

const RETENTION_MONTHS = 12;

export async function POST(req: Request) {
  const h = await headers();
  const ip = clientAddress(h);

  const limited = rateLimit(rateLimitKey("chat", ip), 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  const { body, path } = parsed.data;

  // Visitor identity is an opaque cookie. No name, no email, unless volunteered.
  const jar = await cookies();
  let anonymousId = jar.get(VISITOR_COOKIE)?.value;
  if (!anonymousId) {
    anonymousId = randomUUID();
    jar.set(VISITOR_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  let [visitor] = await db.select().from(chatVisitors).where(eq(chatVisitors.anonymousId, anonymousId));
  if (!visitor) {
    [visitor] = await db
      .insert(chatVisitors)
      .values({ anonymousId, userAgent: h.get("user-agent") ?? null })
      .returning();
  }
  if (visitor.blocked) {
    return NextResponse.json({ error: "This conversation has been closed." }, { status: 403 });
  }

  // Reuse the open conversation if the client sent one that really belongs to this visitor.
  let convo = null;
  if (parsed.data.conversationId) {
    [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, parsed.data.conversationId), eq(conversations.visitorId, visitor.id)));
  }
  if (!convo || convo.status === "CLOSED") {
    const deleteAfter = new Date();
    deleteAfter.setMonth(deleteAfter.getMonth() + RETENTION_MONTHS);
    try {
      const created = await insertWithReference("C", (candidate) =>
        db
          .insert(conversations)
          .values({
            reference: candidate,
            visitorId: visitor.id,
            referrerPath: path ?? null,
            subject: body.slice(0, 120),
            deleteAfter,
          })
          .returning(),
      );
      [convo] = created.result;
    } catch (err) {
      log.error("could not open a conversation", { err });
      return NextResponse.json(
        { error: "We could not start the conversation. Please try again." },
        { status: 503 },
      );
    }
  }

  await db.insert(chatMessages).values({ conversationId: convo.id, author: "VISITOR", body });
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, convo.id));

  // Once a person has taken the conversation the assistant stays out of it.
  if (convo.status === "ASSIGNED" || convo.status === "WAITING" || convo.status === "ESCALATED") {
    await publish(convo.id, { id: randomUUID(), author: "SYSTEM", body: "Delivered to the team." });
    return NextResponse.json({ conversationId: convo.id, reply: null });
  }

  const cfg = await getAssistantSettings();

  // Claim a reply slot atomically. The previous code read convo.aiReplies before
  // calling the assistant and wrote back that value plus one, so concurrent
  // messages all read the same number and the cap never advanced — measured at
  // zero after eight concurrent messages that produced nine replies. Incrementing
  // in SQL and reading the result back makes the cap a real limit.
  const [claimed] = await db
    .update(conversations)
    .set({ aiReplies: sql`${conversations.aiReplies} + 1` })
    .where(eq(conversations.id, convo.id))
    .returning({ aiReplies: conversations.aiReplies });
  const replyNumber = claimed?.aiReplies ?? convo.aiReplies + 1;

  if (replyNumber > cfg.maxRepliesPerConversation || cfg.spentThisMonthUsd >= cfg.monthlyCapUsd) {
    // Hold the counter at the cap rather than letting it climb with every
    // further message, so the number on the chat screen stays meaningful.
    await db
      .update(conversations)
      .set({ status: "WAITING", aiReplies: cfg.maxRepliesPerConversation })
      .where(eq(conversations.id, convo.id));
    const [stored] = await db
      .insert(chatMessages)
      .values({ conversationId: convo.id, author: "ASSISTANT", body: cfg.handoverMessage })
      .returning({ id: chatMessages.id });
    return NextResponse.json({
      conversationId: convo.id,
      // The stored id, not a fresh one: the widget de-duplicates on it and the
      // SSE stream uses it as the replay marker.
      reply: { id: stored.id, author: "ASSISTANT" as const, body: cfg.handoverMessage, handover: true },
    });
  }

  const answer = await ask(body, {
    enabled: cfg.enabled,
    restrictToContent: cfg.restrictToContent,
    showSources: cfg.showSources,
    handOverWhenUnsure: cfg.handOverWhenUnsure,
    confidenceThreshold: cfg.confidenceThreshold,
    maxRepliesPerConversation: cfg.maxRepliesPerConversation,
    neverDiscuss: cfg.neverDiscuss,
    handoverMessage: cfg.handoverMessage,
    assistantName: cfg.assistantName,
  });

  const [saved] = await db
    .insert(chatMessages)
    .values({
      conversationId: convo.id,
      author: "ASSISTANT",
      body: answer.body,
      sources: answer.sources,
      confidence: answer.confidence,
      model: answer.model,
      inputTokens: answer.inputTokens,
      outputTokens: answer.outputTokens,
    })
    .returning();

  // Token cost is charged against the monthly cap. Without this the cap could
  // never trip: spentThisMonthUsd was read by the gate above, displayed on the
  // admin screen, and written by nothing.
  if (answer.inputTokens || answer.outputTokens) {
    await recordSpend(priceUsd(answer.model, answer.inputTokens, answer.outputTokens));
  }

  if (answer.handover) {
    // A handover is not an answer, so it should not consume a reply slot.
    await db
      .update(conversations)
      .set({ aiReplies: sql`greatest(${conversations.aiReplies} - 1, 0)` })
      .where(eq(conversations.id, convo.id));
    // The question goes on the list staff review each week (design review §14).
    const q = body.slice(0, 300);
    await db
      .insert(unansweredQuestions)
      .values({ question: q })
      .onConflictDoUpdate({
        target: unansweredQuestions.question,
        set: { timesAsked: sql`${unansweredQuestions.timesAsked} + 1`, updatedAt: new Date() },
      });
    const open = officeIsOpen(cfg.officeOpen, cfg.officeClose, new Date(), cfg.officeDays);
    await db
      .update(conversations)
      .set({ status: open ? "WAITING" : "AI", lastMessageAt: new Date() })
      .where(eq(conversations.id, convo.id));
  } else {
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, convo.id));
  }

  return NextResponse.json({
    conversationId: convo.id,
    reply: {
      id: saved.id,
      author: "ASSISTANT",
      body: answer.body,
      sources: answer.sources,
      handover: answer.handover,
    },
  });
}
