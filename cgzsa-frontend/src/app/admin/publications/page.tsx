import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, publicationCategories, publications } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, StatusChip, Mono, EditLink } from "@/components/admin/kit";
import { formatDate } from "@/lib/format";
import { humanBytes } from "@/lib/storage";
import type { Status } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function PublicationsList() {
  const actor = await guard("content.create");
  const rows = await db
    .select({
      id: publications.id, title: publications.title, status: publications.status,
      publishedOn: publications.publishedOn, downloads: publications.downloads,
      allowDownload: publications.allowDownload,
      category: publicationCategories.name, bytes: mediaAssets.bytes,
    })
    .from(publications)
    .leftJoin(publicationCategories, eq(publicationCategories.id, publications.categoryId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, publications.fileId))
    .where(isNull(publications.deletedAt))
    .orderBy(desc(publications.publishedOn));

  return (
    <Shell actor={actor} active="/admin/publications" title="Publications"
      actions={<Link href="/admin/publications/new" className="btn btn-primary btn-sm">+ Add publication</Link>}>
      <DataTable
        columns={["Document", "Category", "Published", "Size", "Downloads", "Status", ""]}
        rows={rows.map((p) => [
          <span key="t"><b className="font-semibold">{p.title}</b>{!p.allowDownload && <div><span className="chip chip-mute">View only</span></div>}</span>,
          p.category ?? <span key="c" className="text-[var(--color-ink-3)]">—</span>,
          <Mono key="d">{formatDate(p.publishedOn) || "—"}</Mono>,
          <Mono key="b">{p.bytes ? humanBytes(p.bytes) : "No file"}</Mono>,
          <Mono key="dl">{p.downloads}</Mono>,
          <StatusChip key="st" status={p.status as Status} />,
          <EditLink key="e" href={`/admin/publications/${p.id}`} />,
        ])}
        empty={{
          title: "No publications yet",
          body: "Annual reports, strategic plans, policies and research appear in a searchable library, with view and download controls set per document.",
          action: <Link href="/admin/publications/new" className="btn btn-primary btn-sm">Add the first document</Link>,
        }}
      />
    </Shell>
  );
}
