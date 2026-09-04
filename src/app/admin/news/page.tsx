import Link from "next/link";
import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { articles, categories, users } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, StatusChip, Toolbar, Mono, EditLink } from "@/components/admin/kit";
import { formatDate } from "@/lib/format";
import type { Status } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function NewsList({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const actor = await guard("content.create");
  const { q, status } = await searchParams;

  const clauses: SQL[] = [isNull(articles.deletedAt)];
  if (status) clauses.push(eq(articles.status, status as Status));
  if (q) clauses.push(or(ilike(articles.title, `%${q}%`), ilike(articles.excerpt, `%${q}%`))!);

  const rows = await db
    .select({
      id: articles.id, title: articles.title, slug: articles.slug, status: articles.status,
      publishedAt: articles.publishedAt, publishAt: articles.publishAt,
      category: categories.name, author: users.name,
    })
    .from(articles)
    .leftJoin(categories, eq(categories.id, articles.categoryId))
    .leftJoin(users, eq(users.id, articles.authorId))
    .where(and(...clauses))
    .orderBy(desc(articles.updatedAt));

  const filters = ["", "DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"].map((s) => ({
    label: s === "" ? "All" : s.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    href: s ? `/admin/news?status=${s}` : "/admin/news",
    active: (status ?? "") === s,
  }));

  return (
    <Shell actor={actor} active="/admin/news" title="News"
      actions={<Link href="/admin/news/new" className="btn btn-primary btn-sm">+ New article</Link>}>
      <Toolbar search={q} filters={filters} />
      <DataTable
        columns={["Title", "Category", "Status", "Published", "Author", ""]}
        rows={rows.map((a) => [
          <span key="t"><b className="font-semibold">{a.title}</b><div className="text-[0.76rem] text-[var(--color-ink-3)] font-mono">/news/{a.slug}</div></span>,
          a.category ?? <span key="c" className="text-[var(--color-ink-3)]">—</span>,
          <span key="st">
            <StatusChip status={a.status as Status} />
            {a.publishAt && a.status === "APPROVED" && <div className="mt-1"><span className="chip chip-info">Scheduled</span></div>}
          </span>,
          <Mono key="p">{formatDate(a.publishedAt) || "—"}</Mono>,
          a.author ?? "—",
          <EditLink key="e" href={`/admin/news/${a.id}`} />,
        ])}
        empty={{
          title: "No articles yet",
          body: "News written here appears on the public site, newest first, with its category, tags and featured image.",
          action: <Link href="/admin/news/new" className="btn btn-primary btn-sm">Write the first article</Link>,
        }}
      />
    </Shell>
  );
}
