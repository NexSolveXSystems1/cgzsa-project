import Link from "next/link";
import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { programs, projects } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, StatusChip, Toolbar, EditLink } from "@/components/admin/kit";
import { formatDate } from "@/lib/format";
import type { Status } from "@/lib/workflow";

export const dynamic = "force-dynamic";

const PS_CHIP: Record<string, string> = { PLANNED: "chip-mute", IN_PROGRESS: "chip-info", COMPLETED: "chip-ok", ON_HOLD: "chip-warn" };
const PS_LABEL: Record<string, string> = { PLANNED: "Planned", IN_PROGRESS: "In progress", COMPLETED: "Completed", ON_HOLD: "On hold" };

export default async function ProjectsList({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await guard("content.create");
  const { status } = await searchParams;
  const clauses: SQL[] = [isNull(projects.deletedAt)];
  if (status) clauses.push(eq(projects.status, status as Status));

  const rows = await db
    .select({
      id: projects.id, title: projects.title, slug: projects.slug, status: projects.status,
      projectStatus: projects.projectStatus, county: projects.county, startDate: projects.startDate,
      programme: programs.title,
    })
    .from(projects)
    .leftJoin(programs, eq(programs.id, projects.programId))
    .where(and(...clauses))
    .orderBy(desc(projects.startDate));

  const filters = ["", "DRAFT", "IN_REVIEW", "PUBLISHED"].map((s) => ({
    label: s === "" ? "All" : s.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    href: s ? `/admin/projects?status=${s}` : "/admin/projects",
    active: (status ?? "") === s,
  }));

  return (
    <Shell actor={actor} active="/admin/projects" title="Projects"
      actions={<Link href="/admin/projects/new" className="btn btn-primary btn-sm">+ New project</Link>}>
      <Toolbar filters={filters} />
      <DataTable
        columns={["Project", "Programme", "County", "Progress", "Status", ""]}
        rows={rows.map((p) => [
          <span key="t"><b className="font-semibold">{p.title}</b><div className="text-[0.76rem] text-[var(--color-ink-3)]">{formatDate(p.startDate) || "No start date"}</div></span>,
          p.programme ?? <span key="pr" className="text-[var(--color-ink-3)]">—</span>,
          p.county ?? <span key="c" className="text-[var(--color-ink-3)]">—</span>,
          <span key="ps" className={"chip " + PS_CHIP[p.projectStatus]}>{PS_LABEL[p.projectStatus]}</span>,
          <StatusChip key="st" status={p.status as Status} />,
          <EditLink key="e" href={`/admin/projects/${p.id}`} />,
        ])}
        empty={{
          title: "No projects yet",
          body: "A project is a specific installation in a specific place, with a start date, a county and a status. It appears on the public site once published.",
          action: <Link href="/admin/projects/new" className="btn btn-primary btn-sm">Create the first project</Link>,
        }}
      />
    </Shell>
  );
}
