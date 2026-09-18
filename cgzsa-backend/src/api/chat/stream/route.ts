import { cookies, headers } from "next/headers";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { subscribe, type Frame } from "@/lib/chat-bus";
import { ownedConversation, visitorFromCookie, VISITOR_COOKIE } from "@/lib/chat-visitor";
import { clientAddress } from "@/lib/request";
import { getActor } from "@/lib/auth";
import { logger } from "@/lib/log";

const log = logger("chat.stream");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-sent events. The browser's EventSource reconnects by itself when the
 * connection drops, which is why this was chosen over WebSockets for visitors on
 * mobile networks (design review §14).
 *
 * Three things this route previously did not do:
 *
 *  1. Check who is asking. It subscribed anyone who supplied a conversation id,
 *     so a staff reply reached whoever held that id. The caller must now own the
 *     conversation through their visitor cookie, or hold chat.answer as a
 *     signed-in member of staff.
 *
 *  2. Limit connections. Each stream registers a listener and holds a socket;
 *     with no cap an attacker could open them without bound.
 *
 *  3. Survive a reconnection. Frames published while the connection was down
 *     were emitted to no listener and lost — the exact failure that choosing
 *     EventSource was meant to avoid. Each frame now carries the message id as
 *     its SSE event id, and a reconnecting client's Last-Event-ID header replays
 *     everything it missed before live delivery resumes.
 */

const MAX_STREAMS_PER_ADDRESS = 6;
const openStreams = new Map<string, number>();

function acquire(key: string): boolean {
  const n = openStreams.get(key) ?? 0;
  if (n >= MAX_STREAMS_PER_ADDRESS) return false;
  openStreams.set(key, n + 1);
  return true;
}

function release(key: string) {
  const n = (openStreams.get(key) ?? 1) - 1;
  if (n <= 0) openStreams.delete(key);
  else openStreams.set(key, n);
}

export async function GET(req: Request) {
  const conversationId = new URL(req.url).searchParams.get("conversation");
  if (!conversationId) return new Response("conversation required", { status: 400 });

  // 404 rather than 403 throughout: the endpoint should not confirm that a
  // conversation id exists to somebody who cannot see it.
  const denied = new Response("Not found", { status: 404 });

  const jar = await cookies();
  const visitor = await visitorFromCookie(jar.get(VISITOR_COOKIE)?.value);

  let permitted = false;
  if (visitor && !visitor.blocked) {
    permitted = !!(await ownedConversation(visitor.id, conversationId));
  }
  if (!permitted) {
    // A member of staff answering from the inbox is also a legitimate subscriber.
    const actor = await getActor();
    permitted = !!actor?.permissions.has("chat.answer");
  }
  if (!permitted) return denied;

  const h = await headers();
  const key = clientAddress(h) ?? "unidentified";
  if (!acquire(key)) {
    return new Response("Too many open connections", { status: 429, headers: { "retry-after": "30" } });
  }

  // Anything the client already saw. EventSource resends this automatically on
  // reconnection; the query string is a fallback for a first connection that
  // knows where it left off.
  const lastEventId =
    h.get("last-event-id") ?? new URL(req.url).searchParams.get("lastEventId") ?? null;

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let released = false;

  const cleanup = () => {
    if (released) return;
    released = true;
    clearInterval(heartbeat);
    unsubscribe();
    release(key);
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (frame: Frame) => {
        try {
          controller.enqueue(
            encoder.encode(`id: ${frame.id}\nevent: message\ndata: ${JSON.stringify(frame)}\n\n`),
          );
        } catch {
          /* closed */
        }
      };

      controller.enqueue(encoder.encode(": connected\n\n"));

      // Subscribe before replaying, so a message that arrives during the replay
      // is queued rather than dropped. Duplicates are harmless — the widget
      // already discards a frame whose id it has seen.
      unsubscribe = subscribe(conversationId, send);

      if (lastEventId) {
        try {
          const [marker] = await db
            .select({ createdAt: chatMessages.createdAt })
            .from(chatMessages)
            .where(eq(chatMessages.id, lastEventId))
            .limit(1);
          if (marker) {
            const missed = await db
              .select()
              .from(chatMessages)
              .where(
                and(
                  eq(chatMessages.conversationId, conversationId),
                  gt(chatMessages.createdAt, marker.createdAt),
                ),
              )
              .orderBy(asc(chatMessages.createdAt))
              .limit(100);
            for (const m of missed) {
              send({
                id: m.id,
                author: m.author,
                body: m.body,
                sources: (m.sources as { title: string; url: string }[] | null) ?? undefined,
              });
            }
          }
        } catch (err) {
          log.error("replay failed", { err });
        }
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* closed */
        }
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
