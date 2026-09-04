import Link from "next/link";
import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, StatusChip, Toolbar, Mono, EditLink } from "@/components/admin/kit";
import { formatDate } from "@/lib/format";
import type { Status } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function PagesList({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const actor = await guard("content.create");
  const { q, status } = await searchParams;

  const clauses: SQL[] = [isNull(pages.deletedAt)];
  if (status) clauses.push(eq(pages.status, status as Status));
  if (q) clauses.push(or(ilike(pages.title, `%${q}%`), ilike(pages.slug, `%${q}%`))!);

  const rows = await db.select().from(pages).where(and(...clauses)).orderBy(desc(pages.updatedAt));

  const filters = ["", "DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => ({
    label: s === "" ? "All" : s.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    href: s ? `/admin/pages?status=${s}` : "/admin/pages",
    active: (status ?? "") === s,
  }));

  return (
    <Shell actor={actor} active="/admin/pages" title="Pages"
      actions={<Link href="/admin/pages/new" className="btn btn-primary btn-sm">+ New page</Link>}>
      <Toolbar search={q} filters={filters} />
      <DataTable
        columns={["Title", "Address", "Status", "Updated", ""]}
        rows={rows.map((p) => [
          <b key="t" className="font-semibold">{p.title}</b>,
          <Mono key="s">/{p.slug}</Mono>,
          <StatusChip key="st" status={p.status as Status} />,
          <Mono key="u">{formatDate(p.updatedAt)}</Mono>,
          <EditLink key="e" href={`/admin/pages/${p.id}`} />,
        ])}
        empty={{
          title: "No pages match",
          body: "Create a page, or clear the filter above.",
          action: <Link href="/admin/pages/new" className="btn btn-primary btn-sm">Create a page</Link>,
        }}
      />
    </Shell>
  );
}
