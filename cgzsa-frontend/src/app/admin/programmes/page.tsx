import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, StatusChip, Mono, EditLink } from "@/components/admin/kit";
import type { Status } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function ProgrammesList() {
  const actor = await guard("content.create");
  const rows = await db.select().from(programs).where(isNull(programs.deletedAt)).orderBy(asc(programs.order));

  return (
    <Shell actor={actor} active="/admin/programmes" title="Programmes"
      actions={<Link href="/admin/programmes/new" className="btn btn-primary btn-sm">+ New programme</Link>}>
      <DataTable
        columns={["Programme", "Address", "Order", "Status", ""]}
        rows={rows.map((p) => [
          <span key="t"><b className="font-semibold">{p.title}</b><div className="text-[0.76rem] text-[var(--color-ink-3)]">{p.tagline}</div></span>,
          <Mono key="s">/programs/{p.slug}</Mono>,
          <Mono key="o">{p.order}</Mono>,
          <StatusChip key="st" status={p.status as Status} />,
          <EditLink key="e" href={`/admin/programmes/${p.id}`} />,
        ])}
        empty={{ title: "No programmes", body: "The five CGZSA programmes are seeded by default." }}
      />
    </Shell>
  );
}
