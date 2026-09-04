import { redirect } from "next/navigation";
import Link from "next/link";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cannedReplies, chatMessages, chatVisitors, conversations, users } from "@/db/schema";
import { getActor } from "@/lib/auth";
import { Shell } from "@/components/admin/Shell";
import { relative, formatTime } from "@/lib/format";
import { ReplyBox } from "@/components/admin/ReplyBox";
import { retrieve } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  AI: "chip-info",
  WAITING: "chip-bad",
  ASSIGNED: "chip-warn",
  RESOLVED: "chip-ok",
  ESCALATED: "chip-warn",
  CLOSED: "chip-mute",
};
const STATUS_LABEL: Record<string, string> = {
  AI: "Assistant answering",
  WAITING: "Waiting for staff",
  ASSIGNED: "With a person",
  RESOLVED: "Resolved",
  ESCALATED: "Escalated to email",
  CLOSED: "Closed",
};

export default async function ChatInbox({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/admin");
  // Two permissions, and they mean different things.
  //
  // chat.answer is the live queue: the conversations a person is here to reply
  // to. chat.transcripts is "Read chat transcripts and export" — the archive of
  // conversations that are finished, which is a records-access question rather
  // than an operational one.
  //
  // That second permission was seeded, granted to two roles, rendered in the
  // matrix on the users screen, and checked nowhere, so an Editor could read
  // every closed conversation and every visitor email address the interface said
  // they could not. The queue below is now filtered by which of the two the
  // person holds, so an Editor keeps the job they are meant to do.
  if (!actor.permissions.has("chat.answer") && !actor.permissions.has("chat.transcripts")) {
    redirect("/admin/dashboard");
  }
  const mayReadArchive = actor.permissions.has("chat.transcripts");

  const { c } = await searchParams;

  // Seeded from the start and read by nothing, so staff retyped the same
  // answers. They are short, so the whole list is fetched.
  const canned = await db
    .select({ id: cannedReplies.id, label: cannedReplies.label, body: cannedReplies.body })
    .from(cannedReplies)
    .orderBy(asc(cannedReplies.order));

  const list = await db
    .select({
      id: conversations.id,
      reference: conversations.reference,
      status: conversations.status,
      subject: conversations.subject,
      lastMessageAt: conversations.lastMessageAt,
      startedAt: conversations.startedAt,
      aiReplies: conversations.aiReplies,
      referrerPath: conversations.referrerPath,
      visitorEmail: chatVisitors.email,
      visitorAgent: chatVisitors.userAgent,
      assignedName: users.name,
      count: sql<number>`(select count(*)::int from ${chatMessages} m where m.conversation_id = ${conversations.id})`,
    })
    .from(conversations)
    .innerJoin(chatVisitors, eq(chatVisitors.id, conversations.visitorId))
    .leftJoin(users, eq(users.id, conversations.assignedToId))
    // Without chat.transcripts a person sees only conversations that are still
    // live. Closed and resolved threads are the archive.
    .where(mayReadArchive ? undefined : inArray(conversations.status, ["AI", "WAITING", "ASSIGNED", "ESCALATED"]))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(40);

  const waiting = list.filter((x) => x.status === "WAITING" || x.status === "ESCALATED").length;
  const selected = list.find((x) => x.id === c) ?? list[0] ?? null;

  const thread = selected
    ? await db.select().from(chatMessages).where(eq(chatMessages.conversationId, selected.id)).orderBy(asc(chatMessages.createdAt))
    : [];

  // The assistant's suggestion for staff. It is never sent automatically.
  const lastVisitor = [...thread].reverse().find((m) => m.author === "VISITOR");
  const suggestion = lastVisitor ? (await retrieve(lastVisitor.body, 2))[0] ?? null : null;

  return (
    <Shell
      actor={actor}
      active="/admin/chat"
      title="Live chat"
      counts={{ "/admin/chat": waiting }}
      actions={
        <>
          {waiting > 0 && <span className="chip chip-bad">{waiting} waiting</span>}
          <Link href="/admin/chat/knowledge" className="btn btn-ghost btn-sm">Knowledge base</Link>
        </>
      }
    >
      {list.length === 0 ? (
        <div className="card px-7 py-12 text-center">
          <h3 className="text-lg mb-2">No conversations yet</h3>
          <p className="text-[var(--color-ink-3)] text-[0.9rem] max-w-[46ch] mx-auto m-0">
            Open the public site and use the chat widget in the bottom-right corner. Conversations arrive here the
            moment the assistant cannot answer, or when a visitor asks for a person.
          </p>
        </div>
      ) : (
        <div className="grid border border-[var(--color-line)] rounded-lg overflow-hidden bg-white min-h-[620px] lg:grid-cols-[288px_minmax(0,1fr)_262px]">
          {/* Queue */}
          <div className="border-r border-[var(--color-line)] overflow-auto max-h-[75vh]">
            {list.map((x) => (
              <Link
                key={x.id}
                href={`/admin/chat?c=${x.id}`}
                aria-current={selected?.id === x.id ? "true" : undefined}
                className={
                  "block px-3.5 py-3 border-b border-[var(--color-line)] border-l-[3px] no-underline text-inherit " +
                  (selected?.id === x.id ? "bg-[var(--color-brand-soft)] border-l-[var(--color-brand)]" : "border-l-transparent hover:bg-[var(--color-surface-2)]")
                }
              >
                <span className="flex justify-between items-baseline gap-2 mb-0.5">
                  <b className="text-[0.86rem] font-semibold truncate">{x.subject ?? "Conversation"}</b>
                  <span className="font-mono text-[0.68rem] text-[var(--color-ink-3)] whitespace-nowrap">{relative(x.lastMessageAt)}</span>
                </span>
                <span className="block text-[0.79rem] text-[var(--color-ink-2)] mb-1.5 truncate">
                  {x.reference} · {x.count} messages
                </span>
                <span className={"chip " + (STATUS_CHIP[x.status] ?? "chip-mute")}>{STATUS_LABEL[x.status]}</span>
              </Link>
            ))}
          </div>

          {/* Thread */}
          <div className="flex flex-col min-w-0">
            {selected && (
              <>
                <div className="px-4.5 px-5 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex flex-wrap items-center gap-3">
                  <b className="font-sans text-[0.92rem] font-bold">{selected.subject ?? "Conversation"}</b>
                  <span className={"chip " + (STATUS_CHIP[selected.status] ?? "chip-mute")}>{STATUS_LABEL[selected.status]}</span>
                  <div className="flex-1" />
                  <ReplyBox
                    conversationId={selected.id}
                    mode="header"
                    claimed={selected.status === "ASSIGNED"}
                    canClose={actor.permissions.has("chat.close")}
                  />
                </div>

                <div className="p-5 flex flex-col gap-3 overflow-auto bg-[var(--color-paper)] flex-1 max-h-[55vh]">
                  {thread.map((m) =>
                    m.author === "SYSTEM" ? (
                      <div key={m.id} className="self-center text-center font-mono text-[0.72rem] text-[var(--color-ink-3)]">
                        {m.body} · {formatTime(m.createdAt)}
                      </div>
                    ) : (
                      <div
                        key={m.id}
                        className={
                          "max-w-[70%] rounded-xl px-3.5 py-2.5 text-[0.86rem] leading-relaxed " +
                          (m.author === "VISITOR"
                            ? "self-end bg-[var(--color-brand)] text-white rounded-br-sm"
                            : m.author === "STAFF"
                              ? "self-start bg-white border border-[var(--color-brand)] rounded-bl-sm text-[var(--color-ink-2)]"
                              : "self-start bg-white border border-[var(--color-line)] rounded-bl-sm text-[var(--color-ink-2)]")
                        }
                      >
                        {m.author !== "VISITOR" && (
                          <span className="block font-mono text-[0.66rem] tracking-[0.09em] uppercase mb-1 text-[var(--color-ink-3)]">
                            {m.author === "ASSISTANT" ? "Assistant" : "Staff"}
                            {m.confidence != null && ` · confidence ${m.confidence.toFixed(2)}`}
                          </span>
                        )}
                        {m.body}
                        {Array.isArray(m.sources) && (m.sources as { title: string; url: string }[]).length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--color-line)] flex flex-wrap gap-1.5">
                            {(m.sources as { title: string; url: string }[]).map((sx) => (
                              <span key={sx.url} className="text-[0.7rem] text-[var(--color-brand)] border border-[var(--color-line-2)] rounded-full px-2 py-0.5">
                                {sx.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>

                <div className="border-t border-[var(--color-line)] px-4 py-3 bg-white">
                  {suggestion && (
                    <div className="rounded-[5px] border border-[var(--color-brand)] bg-[var(--color-brand-soft)] px-3.5 py-3 mb-3">
                      <div className="font-mono text-[0.72rem] tracking-[0.1em] uppercase text-[var(--color-brand)] mb-1.5">
                        Relevant passage · {suggestion.title}
                      </div>
                      <p className="m-0 text-[0.83rem] text-[var(--color-ink-2)] leading-relaxed">
                        {suggestion.body.slice(0, 260)}…
                      </p>
                      <p className="m-0 mt-2 text-[0.72rem] text-[var(--color-ink-3)]">
                        Shown to help you answer. Nothing reaches the visitor until you send it.
                      </p>
                    </div>
                  )}
                  <ReplyBox canned={canned} conversationId={selected.id} mode="composer" claimed={selected.status === "ASSIGNED"} />
                </div>
              </>
            )}
          </div>

          {/* Detail */}
          <div className="border-l border-[var(--color-line)] p-4 overflow-auto hidden lg:block">
            {selected && (
              <>
                <h4 className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--color-ink-3)] m-0 mb-2.5">Conversation</h4>
                {[
                  ["Reference", selected.reference],
                  ["Started", formatTime(selected.startedAt)],
                  ["Messages", String(selected.count)],
                  ["Assistant replies", String(selected.aiReplies)],
                  ["Handled by", selected.assignedName ?? "Assistant, then queue"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2.5 py-1.5 border-b border-[var(--color-line)] text-[0.8rem]">
                    <span>{k}</span><span className="text-[var(--color-ink-2)] text-right">{v}</span>
                  </div>
                ))}
                <h4 className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--color-ink-3)] mt-5 mb-2.5">Visitor</h4>
                {[
                  ["Email", selected.visitorEmail ?? "Not given"],
                  ["Came from", selected.referrerPath ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2.5 py-1.5 border-b border-[var(--color-line)] text-[0.8rem]">
                    <span>{k}</span><span className="text-[var(--color-ink-2)] text-right break-all">{v}</span>
                  </div>
                ))}
                <p className="text-[0.72rem] text-[var(--color-ink-3)] mt-3.5 leading-relaxed">
                  Transcripts are kept for 12 months, then deleted. Every action here is recorded in the audit log.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
