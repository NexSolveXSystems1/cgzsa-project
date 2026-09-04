import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { programs, projects } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { formatDate } from "@/lib/format";

export const revalidate = 300;
export const metadata = { title: "Projects" };

const PS: Record<string, [string, string]> = {
  PLANNED: ["Planned", "chip-mute"], IN_PROGRESS: ["In progress", "chip-info"],
  COMPLETED: ["Completed", "chip-ok"], ON_HOLD: ["On hold", "chip-warn"],
};

export default async function Projects({ searchParams }: { searchParams: Promise<{ programme?: string; county?: string }> }) {
  const q = await searchParams;

  const rows = await db
    .select({
      id: projects.id, slug: projects.slug, title: projects.title, summary: projects.summary,
      county: projects.county, projectStatus: projects.projectStatus, startDate: projects.startDate,
      programme: programs.title, programmeSlug: programs.slug,
    })
    .from(projects).leftJoin(programs, eq(programs.id, projects.programId))
    .where(and(eq(projects.status, "PUBLISHED"), isNull(projects.deletedAt)))
    .orderBy(desc(projects.startDate));

  const progs = [...new Map(rows.filter((r) => r.programmeSlug).map((r) => [r.programmeSlug!, r.programme!])).entries()];
  const counties = [...new Set(rows.map((r) => r.county).filter(Boolean))] as string[];
  const shown = rows.filter((r) =>
    (!q.programme || r.programmeSlug === q.programme) && (!q.county || r.county === q.county));

  const pill = (label: string, href: string, active: boolean) => (
    <Link key={href} href={href} className={"rounded-full border px-3.5 py-1.5 text-[0.83rem] no-underline " +
      (active ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-semibold" : "bg-white border-[var(--color-line)] text-[var(--color-ink-2)]")}>
      {label}
    </Link>
  );

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Projects"]]} eyebrow="Our work" title="Projects"
        lede="Individual clean-ups, installations and restorations, by programme, county and status." />
      <section className="py-14"><div className="wrap">
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            {pill("All", "/projects", !q.programme && !q.county)}
            {progs.map(([slug, name]) => pill(name, `/projects?programme=${slug}`, q.programme === slug))}
            {counties.map((c) => pill(c, `/projects?county=${encodeURIComponent(c)}`, q.county === c))}
          </div>
        )}

        {shown.length === 0 ? (
          <EmptyState title="No projects published yet"
            body="A project is a specific installation in a specific place, with a start date, a county and a status. The first will appear here as soon as it is published." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <Link key={p.id} href={`/projects/${p.slug}`} className="card p-5 no-underline text-inherit flex flex-col gap-2 transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex gap-2 flex-wrap">
                  <span className={"chip " + PS[p.projectStatus][1]}>{PS[p.projectStatus][0]}</span>
                  {p.county && <span className="chip chip-mute chip-none">{p.county}</span>}
                </div>
                <h2 className="text-[1.05rem] leading-snug">{p.title}</h2>
                <p className="m-0 text-[0.87rem] text-[var(--color-ink-2)] line-clamp-3">{p.summary}</p>
                <div className="mt-auto pt-2.5 font-mono text-[0.74rem] text-[var(--color-ink-3)]">
                  {p.programme ?? "—"}{p.startDate ? ` · ${formatDate(p.startDate)}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
