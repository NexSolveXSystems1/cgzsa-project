import { notFound, permanentRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, pages, redirects } from "@/db/schema";
import { CmsPage } from "@/components/public/CmsPage";
import { mediaStoryImage, STORY_IMAGES } from "@/components/public/storyImages";
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
  const [page] = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      excerpt: pages.excerpt,
      status: pages.status,
      deletedAt: pages.deletedAt,
      imageKey: mediaAssets.storageKey,
      imageAlt: mediaAssets.altText,
    })
    .from(pages)
    .leftJoin(mediaAssets, eq(mediaAssets.id, pages.imageId))
    .where(eq(pages.slug, slug))
    .limit(1);
  if (!page || page.status !== "PUBLISHED" || page.deletedAt) return {};
  const fallback = page.slug.startsWith("get-involved/")
    ? STORY_IMAGES.safeWater
    : page.slug.startsWith("about")
      ? STORY_IMAGES.communityCleanup
      : STORY_IMAGES.publicSpace;
  return pageMetadata({
    path: `/${page.slug}`,
    title: page.title,
    description: page.excerpt ?? undefined,
    image: mediaStoryImage(page.imageKey, page.imageAlt, fallback).src,
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

  const [page] = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      excerpt: pages.excerpt,
      body: pages.body,
      section: pages.section,
      status: pages.status,
      deletedAt: pages.deletedAt,
      imageKey: mediaAssets.storageKey,
      imageAlt: mediaAssets.altText,
    })
    .from(pages)
    .leftJoin(mediaAssets, eq(mediaAssets.id, pages.imageId))
    .where(eq(pages.slug, slug))
    .limit(1);
  if (page && page.status === "PUBLISHED" && !page.deletedAt) {
    const crumbs: [string, string?][] = [["Home", "/"]];
    if (page.section) crumbs.push([page.section]);
    crumbs.push([page.title]);
    const fallback = page.section === "About"
      ? STORY_IMAGES.communityCleanup
      : page.section === "Get Involved"
        ? STORY_IMAGES.safeWater
        : STORY_IMAGES.publicSpace;
    return <CmsPage page={page} crumbs={crumbs} fallbackImage={fallback} />;
  }

  const [hop] = await db.select().from(redirects).where(eq(redirects.from, `/${slug}`)).limit(1);
  if (hop) permanentRedirect(hop.to);

  notFound();
}
