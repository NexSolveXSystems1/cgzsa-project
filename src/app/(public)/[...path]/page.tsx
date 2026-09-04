import { notFound, permanentRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages, redirects } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";
import { renderSafeHtml } from "@/lib/sanitise";
import { pageMetadata, seoOverrides } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * These pages had no metadata function at all, so every CMS-authored page
 * inherited only the site-wide title and description — no canonical, no share
 * image, and no way for an editor to set either. seo_meta now supplies both.
 */
export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const slug = path.join("/");
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!page || page.status !== "PUBLISHED" || page.deletedAt) return {};
  return pageMetadata({
    path: `/${page.slug}`,
    title: page.title,
    description: page.excerpt ?? undefined,
    override: await seoOverrides("page", page.id),
  });
}

/**
 * Catch-all for published pages created in the content system, and for
 * addresses that used to exist. A published address must never break.
 */
export default async function CatchAll({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const slug = path.join("/");

  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (page && page.status === "PUBLISHED" && !page.deletedAt) {
    const crumbs: [string, string?][] = [["Home", "/"]];
    if (page.section) crumbs.push([page.section]);
    crumbs.push([page.title]);
    return (
      <>
        <PageHead crumbs={crumbs} eyebrow={page.section ?? undefined} title={page.title} lede={page.excerpt ?? undefined} />
        <section className="py-14"><div className="wrap prose-cg">
          <div dangerouslySetInnerHTML={{ __html: renderSafeHtml(page.body) }} />
        </div></section>
      </>
    );
  }

  const [hop] = await db.select().from(redirects).where(eq(redirects.from, `/${slug}`)).limit(1);
  if (hop) permanentRedirect(hop.to);

  notFound();
}
