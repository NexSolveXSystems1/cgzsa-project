import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, pages } from "@/db/schema";
import { renderSafeHtml } from "@/lib/sanitise";
import { pageMetadata, seoOverrides } from "@/lib/seo";
import { PageHead } from "./PageHead";
import { mediaStoryImage, type StoryImage } from "./storyImages";

export type CmsPageRecord = Awaited<ReturnType<typeof getPublishedCmsPage>>;
export type PublishedCmsPage = NonNullable<CmsPageRecord>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cmsBodyHtml(body: string) {
  if (/<[a-z][\s\S]*>/i.test(body)) return renderSafeHtml(body);
  return renderSafeHtml(
    body
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
      .join(""),
  );
}

export async function getPublishedCmsPage(slug: string) {
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

  return page && page.status === "PUBLISHED" && !page.deletedAt ? page : null;
}

export async function cmsMetadata(slug: string, fallback: { path: string; title: string; description: string; image?: StoryImage }) {
  const page = await getPublishedCmsPage(slug);
  if (!page) {
    return pageMetadata({
      path: fallback.path,
      title: fallback.title,
      description: fallback.description,
      image: fallback.image?.src,
    });
  }

  const image = page.imageKey ? `/api/media/${page.imageKey}` : fallback.image?.src;
  return pageMetadata({
    path: fallback.path,
    title: page.title,
    description: page.excerpt ?? fallback.description,
    image,
    override: await seoOverrides("page", page.id),
  });
}

export function cmsImage(page: CmsPageRecord, fallback: StoryImage) {
  return mediaStoryImage(page?.imageKey, page?.imageAlt, fallback);
}

export function CmsBody({
  page,
  className = "py-14",
  wrapClassName = "wrap prose-cg max-w-none",
}: {
  page: CmsPageRecord;
  className?: string;
  wrapClassName?: string;
}) {
  if (!page?.body.trim()) return null;

  return (
    <section className={className}>
      <div className={wrapClassName}>
        <div dangerouslySetInnerHTML={{ __html: cmsBodyHtml(page.body) }} />
      </div>
    </section>
  );
}

export function CmsPage({
  page,
  crumbs,
  eyebrow,
  fallbackImage,
  narrow = false,
}: {
  page: PublishedCmsPage;
  crumbs: [string, string?][];
  eyebrow?: string;
  fallbackImage?: StoryImage;
  narrow?: boolean;
}) {
  const image = fallbackImage
    ? mediaStoryImage(page.imageKey, page.imageAlt, fallbackImage)
    : page.imageKey
      ? { src: `/api/media/${page.imageKey}`, alt: page.imageAlt ?? page.title, credit: "CMS upload" }
      : undefined;
  return (
    <>
      <PageHead
        crumbs={crumbs}
        eyebrow={eyebrow ?? page.section ?? undefined}
        title={page.title}
        lede={page.excerpt ?? undefined}
        image={image}
      />
      <section className="py-14">
        <div className={(narrow ? "wrap-narrow" : "wrap") + " prose-cg max-w-none"}>
          <div dangerouslySetInnerHTML={{ __html: cmsBodyHtml(page.body) }} />
        </div>
      </section>
    </>
  );
}
