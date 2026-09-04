import { redirect } from "next/navigation";
import { desc, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { knowledgePassages, knowledgeSources, unansweredQuestions } from "@/db/schema";
import { getActor } from "@/lib/auth";
import { Shell } from "@/components/admin/Shell";
import { formatDate } from "@/lib/format";
import { GapRow, ReindexButton } from "@/components/admin/GapRow";

export const dynamic = "force-dynamic";

export default async function Knowledge() {
  const actor = await getActor();
  if (!actor) redirect("/admin");
  if (!actor.permissions.has("knowledge.edit")) redirect("/admin/dashboard");

  const sources = await db
    .select({
      id: knowledgeSources.id,
      label: knowledgeSources.label,
      automatic: knowledgeSources.automatic,
      itemCount: knowledgeSources.itemCount,
      lastIndexedAt: knowledgeSources.lastIndexedAt,
      passages: sql<number>`(select count(*)::int from ${knowledgePassages} p where p.source_id = ${knowledgeSources.id})`,
    })
    .from(knowledgeSources);

  const gaps = await db.select().from(unansweredQuestions)
    .where(isNull(unansweredQuestions.resolvedAt))
    .orderBy(desc(unansweredQuestions.timesAsked)).limit(20);
  const totalPassages = sources.reduce((n, s) => n + s.passages, 0);

  return (
    <Shell actor={actor} active="/admin/chat/knowledge" title="Knowledge base">
      <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-brand)] bg-white px-5 py-4 mb-6">
        <p className="font-bold text-[0.87rem] m-0 mb-1.5">The assistant reads your website, not the internet</p>
        <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">
          Everything published on the site is indexed. Nothing else is. When the assistant cannot answer, the question
          appears below so you can decide whether it deserves a page, an FAQ entry, or a written answer.
        </p>
      </div>

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))" }}>
        {[
          ["Sources indexed", sources.length, "Automatic on publish"],
          ["Passages", totalPassages, "Searchable fragments"],
          ["Unanswered questions", gaps.length, "Awaiting your decision"],
        ].map(([k, v, d]) => (
          <div key={k as string} className="card px-5 py-4">
            <div className="font-mono text-[0.73rem] uppercase text-[var(--color-ink-3)]">{k}</div>
            <div className="font-serif text-[2rem] font-bold leading-tight mt-1.5 tabular-nums">{v}</div>
            <div className="text-[0.76rem] text-[var(--color-ink-3)] mt-0.5">{d}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden mb-5">
        <header className="px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center gap-3">
          <h3 className="font-sans text-[0.9rem] font-bold">Sources</h3>
          <div className="flex-1" />
          <ReindexButton />
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.86rem] min-w-[560px]">
            <thead>
              <tr className="bg-[var(--color-surface-2)] text-left">
                {["Source", "Items", "Passages", "Last indexed", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-t border-[var(--color-line)]">
                  <td className="px-4 py-2.5">
                    <b className="font-semibold">{s.label}</b>
                    <div className="text-[0.76rem] text-[var(--color-ink-3)]">
                      {s.automatic ? "Indexed automatically when content is published" : "Written by staff"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono">{s.itemCount}</td>
                  <td className="px-4 py-2.5 font-mono">{s.passages}</td>
                  <td className="px-4 py-2.5 font-mono text-[0.78rem]">{formatDate(s.lastIndexedAt) || "—"}</td>
                  <td className="px-4 py-2.5">
                    {s.passages > 0 ? <span className="chip chip-ok">Indexed</span> : <span className="chip chip-mute">Nothing to index</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <header className="px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center gap-3">
          <h3 className="font-sans text-[0.9rem] font-bold">Questions the assistant could not answer</h3>
          <div className="flex-1" />
          {gaps.length > 0 && <span className="chip chip-warn">{gaps.length}</span>}
        </header>
        <div className="p-4">
          {gaps.length === 0 ? (
            <p className="text-[0.85rem] text-[var(--color-ink-3)] m-0">
              Nothing yet. Questions appear here when the assistant declines to answer.
            </p>
          ) : (
            gaps.map((g) => <GapRow key={g.id} id={g.id} question={g.question} timesAsked={g.timesAsked} />)
          )}
        </div>
      </div>
    </Shell>
  );
}
