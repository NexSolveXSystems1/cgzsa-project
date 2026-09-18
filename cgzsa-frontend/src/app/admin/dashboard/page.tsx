import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, chatMessages, contactMessages, conversations, pages, programs, unansweredQuestions } from "@/db/schema";
import { getActor } from "@/lib/auth";
import { Shell } from "@/components/admin/Shell";
import { relative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const actor = await getActor();
  if (!actor) redirect("/admin");

  const [waiting, aiAnswered, publishedPages, progCount, unread, gaps, recent] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(conversations).where(inArray(conversations.status, ["WAITING", "ESCALATED"])),
    db.select({ n: sql<number>`count(*)::int` }).from(chatMessages).where(eq(chatMessages.author, "ASSISTANT")),
    db.select({ n: sql<number>`count(*)::int` }).from(pages).where(eq(pages.status, "PUBLISHED")),
    db.select({ n: sql<number>`count(*)::int` }).from(programs).where(eq(programs.status, "PUBLISHED")),
    db.select({ n: sql<number>`count(*)::int` }).from(contactMessages).where(eq(contactMessages.status, "UNREAD")),
    db.select({ n: sql<number>`count(*)::int` }).from(unansweredQuestions),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10),
  ]);

  const kpis: [string, number | string, string][] = [
    ["Live chats waiting", waiting[0].n, waiting[0].n ? "Needs a person" : "Nothing waiting"],
    ["Answered by the assistant", aiAnswered[0].n, "Replies sent to visitors"],
    ["Published pages", publishedPages[0].n, "All live"],
    ["Programmes", progCount[0].n, "Published"],
    ["Unread messages", unread[0].n, unread[0].n ? "In the inbox" : "Inbox clear"],
    ["Questions it could not answer", gaps[0].n, "Awaiting your decision"],
  ];

  return (
    <Shell actor={actor} active="/admin/dashboard" title="Dashboard" counts={{ "/admin/chat": waiting[0].n }}>
      <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-warn)] bg-[var(--color-warn-soft)] px-5 py-4 mb-6">
        <p className="font-bold text-[0.87rem] m-0 mb-1.5">Several content areas are still empty</p>
        <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">
          Projects, events, publications, the media gallery, partners and team photographs have no entries. Each is
          marked with a placeholder on the public site until you add content here.
        </p>
      </div>

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))" }}>
        {kpis.map(([k, v, d]) => (
          <div key={k} className="card px-4.5 py-4 px-5">
            <div className="font-mono text-[0.73rem] uppercase tracking-[0.04em] text-[var(--color-ink-3)]">{k}</div>
            <div className="font-serif text-[2rem] font-bold leading-tight mt-1.5 tabular-nums">{v}</div>
            <div className="text-[0.76rem] text-[var(--color-ink-3)] mt-0.5">{d}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4.5 gap-5 lg:grid-cols-[1.55fr_1fr] items-start">
        <div className="card overflow-hidden">
          <header className="px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center gap-3">
            <h3 className="font-sans text-[0.9rem] font-bold">Recent activity</h3>
            <div className="flex-1" />
            <Link href="/admin/audit" className="text-[0.8rem] no-underline">Full audit log →</Link>
          </header>
          <div className="p-4">
            {recent.length === 0 && <p className="text-[0.85rem] text-[var(--color-ink-3)] m-0">Nothing recorded yet.</p>}
            {recent.map((r) => (
              <div key={r.id} className="flex gap-3 py-2.5 border-b border-[var(--color-line)] last:border-0 text-[0.83rem]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] mt-2 shrink-0" />
                <span className="min-w-0">
                  <b className="font-semibold">{r.action}</b> — <span className="text-[var(--color-ink-2)]">{r.actorLabel}</span>
                  {r.detail && <span className="text-[var(--color-ink-3)]"> · {r.detail}</span>}
                </span>
                <span className="ml-auto font-mono text-[0.7rem] text-[var(--color-ink-3)] whitespace-nowrap shrink-0">{relative(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <header className="px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
            <h3 className="font-sans text-[0.9rem] font-bold">Quick actions</h3>
          </header>
          <div className="p-4 grid gap-2.5">
            {[
              ["/admin/chat", "Answer a waiting chat"],
              ["/admin/chat/knowledge", "See what the assistant could not answer"],
              ["/admin/audit", "Review the audit log"],
              ["/", "Open the public site"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[5px] border border-[var(--color-line)] no-underline text-[0.875rem] font-medium text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
