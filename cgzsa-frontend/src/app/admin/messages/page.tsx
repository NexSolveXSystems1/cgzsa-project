import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Toolbar, Mono, Note } from "@/components/admin/kit";
import { MessageActions } from "@/components/admin/MessageActions";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHIP: Record<string, string> = { UNREAD: "chip-bad", READ: "chip-info", REPLIED: "chip-ok", ARCHIVED: "chip-mute" };

export default async function Messages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await guard("messages.read");
  const { status } = await searchParams;

  const clauses: SQL[] = [isNull(contactMessages.deletedAt)];
  if (status) clauses.push(eq(contactMessages.status, status as "UNREAD"));
  const rows = await db.select().from(contactMessages).where(and(...clauses)).orderBy(desc(contactMessages.createdAt));

  const filters = ["", "UNREAD", "REPLIED", "ARCHIVED"].map((s) => ({
    label: s === "" ? "All" : s.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    href: s ? `/admin/messages?status=${s}` : "/admin/messages",
    active: (status ?? "") === s,
  }));

  return (
    <Shell actor={actor} active="/admin/messages" title="Contact messages">
      <Note title="Retention">
        Messages are kept for 24 months and then deleted. <b>Erase</b> removes a record immediately and permanently,
        for a visitor who asks for their data to be removed.
      </Note>
      <Toolbar filters={filters} />
      {rows.length === 0 ? (
        <div className="card px-7 py-12 text-center">
          <h3 className="text-lg mb-2">Nothing here</h3>
          <p className="text-[var(--color-ink-3)] text-[0.9rem] m-0">Messages from the contact form and from live chat arrive here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((m) => (
            <Panel key={m.id}>
              <div className="flex flex-wrap items-center gap-3 mb-2.5">
                <b className="font-semibold text-[0.95rem]">{m.subject}</b>
                <span className={"chip " + CHIP[m.status]}>{m.status.toLowerCase()}</span>
                {m.source === "live_chat" && <span className="chip chip-info">From live chat</span>}
                <Mono>{m.reference}</Mono>
                <div className="flex-1" />
                <Mono>{formatDate(m.createdAt)} {formatTime(m.createdAt)}</Mono>
              </div>
              <div className="text-[0.85rem] text-[var(--color-ink-2)] mb-2.5">
                <b>{m.name}</b> · <a href={`mailto:${m.email}`}>{m.email}</a>
                {m.phone && <> · {m.phone}</>}
              </div>
              <p className="text-[0.88rem] text-[var(--color-ink-2)] whitespace-pre-wrap m-0 mb-3 max-w-[80ch]">{m.body}</p>
              <div className="flex items-center gap-2.5">
                <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="btn btn-primary btn-xs">Reply by email</a>
                <div className="flex-1" />
                <MessageActions id={m.id} kind="message" status={m.status} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </Shell>
  );
}
