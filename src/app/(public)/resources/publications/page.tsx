import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, publicationCategories, publications } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { formatDate } from "@/lib/format";
import { humanBytes } from "@/lib/storage";

export const revalidate = 300;
export const metadata = { title: "Publications & Documents" };

export default async function Publications() {
  const rows = await db
    .select({
      id: publications.id, title: publications.title, description: publications.description,
      publishedOn: publications.publishedOn, allowDownload: publications.allowDownload,
      category: publicationCategories.name, key: mediaAssets.storageKey, bytes: mediaAssets.bytes,
    })
    .from(publications)
    .leftJoin(publicationCategories, eq(publicationCategories.id, publications.categoryId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, publications.fileId))
    .where(and(eq(publications.status, "PUBLISHED"), isNull(publications.deletedAt)))
    .orderBy(desc(publications.publishedOn));

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Resources"], ["Publications"]]} eyebrow="Resources"
        title="Publications & Documents" lede="Reports, policies and organizational documents, free to read and download." />
      <section className="py-14"><div className="wrap">
        {rows.length === 0 ? (
          <EmptyState title="No publications uploaded yet"
            body="Annual reports, strategic plans, policies and research publications appear here, with view and download controls set per document." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-[0.88rem] min-w-[620px]">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-left">
                  {["Document", "Category", "Date", "Size", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--color-line)]">
                    <td className="px-4 py-3">
                      <b className="font-semibold">{p.title}</b>
                      {p.description && <div className="text-[0.8rem] text-[var(--color-ink-3)] max-w-[52ch]">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[0.8rem]">{formatDate(p.publishedOn) || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[0.8rem]">{p.bytes ? humanBytes(p.bytes) : "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.key ? (
                        <a href={`/api/media/${p.key}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs">
                          {p.allowDownload ? "Download" : "View"}
                        </a>
                      ) : <span className="text-[var(--color-ink-3)] text-[0.8rem]">No file</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div></section>
    </>
  );
}
