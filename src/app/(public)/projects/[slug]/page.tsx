import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { impactMetrics, programs, projects } from "@/db/schema";
import { redirectIfMoved } from "@/lib/redirects";
import { PageHead } from "@/components/public/PageHead";
import { formatDate } from "@/lib/format";

export const revalidate = 300;

const PS: Record<string, string> = { PLANNED: "Planned", IN_PROGRESS: "In progress", COMPLETED: "Completed", ON_HOLD: "On hold" };

export async function generateStaticParams() {
  const rows = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.status, "PUBLISHED"));
  return rows.map((r) => ({ slug: r.slug }));
}

export default async function Project({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await db
    .select({
      id: projects.id, title: projects.title, summary: projects.summary, objectives: projects.objectives,
      county: projects.county, location: projects.location, projectStatus: projects.projectStatus,
      startDate: projects.startDate, endDate: projects.endDate,
      programme: programs.title, programmeSlug: programs.slug,
    })
    .from(projects).leftJoin(programs, eq(programs.id, projects.programId))
    .where(and(eq(projects.slug, slug), eq(projects.status, "PUBLISHED"), isNull(projects.deletedAt))).limit(1);
  if (!p) {
    await redirectIfMoved(`/projects/${slug}`);
    notFound();
  }

  const metrics = await db.select().from(impactMetrics).where(eq(impactMetrics.projectId, p.id));

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Projects", "/projects"], [p.title]]}
        eyebrow={p.programme ?? "Project"} title={p.title} />
      <section className="py-14"><div className="wrap grid gap-12 lg:grid-cols-[1fr_300px] items-start">
        <div className="prose-cg">
          <p className="text-[1.1rem] text-[var(--color-ink)]">{p.summary}</p>
          {p.objectives.length > 0 && (<><h2>Objectives</h2><ul>{p.objectives.map((o) => <li key={o}>{o}</li>)}</ul></>)}
          {metrics.length > 0 && (
            <>
              <h2>Impact</h2>
              <div className="grid gap-3 sm:grid-cols-2 not-prose">
                {metrics.map((m) => (
                  <div key={m.id} className="card p-4">
                    <div className="font-serif text-2xl font-bold tabular-nums">{m.actual} <span className="text-[var(--color-ink-3)] text-base font-normal">of {m.target}</span></div>
                    <div className="text-[0.82rem] text-[var(--color-ink-2)] mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <aside className="card p-5 lg:sticky lg:top-28">
          <p className="eyebrow mb-3">Details</p>
          {([["Status", PS[p.projectStatus]], ["Programme", p.programme ?? "—"], ["County", p.county ?? "—"],
             ["Place", p.location ?? "—"], ["Started", formatDate(p.startDate) || "—"],
             ["Completed", formatDate(p.endDate) || "—"]] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 border-b border-[var(--color-line)] last:border-0 text-[0.85rem]">
              <span className="text-[var(--color-ink-3)]">{k}</span><span className="text-right">{v}</span>
            </div>
          ))}
          {p.programmeSlug && (
            <Link href={`/programs/${p.programmeSlug}`} className="btn btn-ghost btn-sm w-full mt-4">About this programme</Link>
          )}
        </aside>
      </div></section>
    </>
  );
}
