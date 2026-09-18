import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { articles, categories, mediaAssets } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";
import { settingImage } from "@/components/public/settingImage";
import { Unavailable } from "@/components/public/Unavailable";
import { formatDate } from "@/lib/format";
import { tryRead } from "@/lib/degrade";
import { getSiteSettings } from "@/lib/settings";

export const revalidate = 120;

export async function generateMetadata() {
  return cmsMetadata("news", {
    path: "/news",
    title: "News & Announcements",
    description: "Updates from our campaigns, installations and community work.",
    image: STORY_IMAGES.communityCleanup,
  });
}

export default async function News({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const settings = await getSiteSettings();
  const [headerFallback, cmsPage] = await Promise.all([
    settingImage(settings.newsPageImageId, STORY_IMAGES.communityCleanup),
    getPublishedCmsPage("news"),
  ]);
  const headerImage = cmsImage(cmsPage, headerFallback);

  // A database blip should not blank the newsroom: the page chrome and
  // navigation still render, with an honest note where the list would be.
  const load = await tryRead("news list", () => db
    .select({
      id: articles.id, slug: articles.slug, title: articles.title, excerpt: articles.excerpt,
      publishedAt: articles.publishedAt, category: categories.name, categorySlug: categories.slug,
      imageKey: mediaAssets.storageKey, imageAlt: mediaAssets.altText,
    })
    .from(articles)
    .leftJoin(categories, eq(categories.id, articles.categoryId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, articles.imageId))
    .where(and(eq(articles.status, "PUBLISHED"), isNull(articles.deletedAt)))
    .orderBy(desc(articles.publishedAt)), []);
  const rows = load.data;

  const cats = [...new Map(rows.filter((r) => r.categorySlug).map((r) => [r.categorySlug!, r.category!])).entries()];
  const shown = category ? rows.filter((r) => r.categorySlug === category) : rows;

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["News"]]} eyebrow={cmsPage?.section ?? "Newsroom"} title={cmsPage?.title ?? "News & Announcements"}
        lede={cmsPage?.excerpt ?? "Updates from our campaigns, installations and community work."}
        image={headerImage} />
      <CmsBody page={cmsPage} className="pt-10 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />
      <section className="py-14"><div className="wrap">
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            <Link href="/news" className={"filter-tab rounded-full border px-3.5 py-1.5 text-[0.83rem] no-underline " + (!category ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-semibold" : "bg-white border-[var(--color-line)] text-[var(--color-ink-2)]")}>All</Link>
            {cats.map(([slug, name]) => (
              <Link key={slug} href={`/news?category=${slug}`} className={"filter-tab rounded-full border px-3.5 py-1.5 text-[0.83rem] no-underline " + (category === slug ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-semibold" : "bg-white border-[var(--color-line)] text-[var(--color-ink-2)]")}>{name}</Link>
            ))}
          </div>
        )}

        {!load.ok ? (
          <Unavailable what="The newsroom" />
        ) : shown.length === 0 ? (
          <EmptyState title="No articles published yet"
            body="News and announcements written in the content system appear here, newest first, with categories, tags and a featured image." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a) => (
              <Link key={a.id} href={`/news/${a.slug}`} className="card overflow-hidden no-underline text-inherit flex flex-col transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-[var(--color-brand-soft)] to-[var(--color-surface-3)] grid place-items-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.imageKey ? `/api/media/${a.imageKey}` : STORY_IMAGES.communityCleanup.src}
                    alt={a.imageKey ? a.imageAlt ?? "" : STORY_IMAGES.communityCleanup.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-5 py-4 flex flex-col gap-2 flex-1">
                  <div className="flex gap-2 items-center font-mono text-[0.74rem] text-[var(--color-ink-3)]">
                    <span>{formatDate(a.publishedAt)}</span>
                    {a.category && <><span>·</span><span>{a.category}</span></>}
                  </div>
                  <h2 className="text-[1.05rem] leading-snug">{a.title}</h2>
                  <p className="m-0 text-[0.87rem] text-[var(--color-ink-2)]">{a.excerpt}</p>
                  <span className="mt-auto pt-2.5 text-[0.8rem] font-semibold text-[var(--color-brand)]">Read more →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
