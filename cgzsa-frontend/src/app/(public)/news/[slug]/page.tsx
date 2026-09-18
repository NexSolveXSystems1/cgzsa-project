import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { articleTags, articles, categories, mediaAssets, tags, users } from "@/db/schema";
import { redirectIfMoved } from "@/lib/redirects";
import { PageHead } from "@/components/public/PageHead";
import { STORY_IMAGES } from "@/components/public/storyImages";
import { formatDate } from "@/lib/format";
import { renderSafeHtml } from "@/lib/sanitise";
import { pageMetadata, seoOverrides } from "@/lib/seo";

export const revalidate = 120;

export async function generateStaticParams() {
  const rows = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.status, "PUBLISHED"));
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [a] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      imageKey: mediaAssets.storageKey,
    })
    .from(articles)
    .leftJoin(mediaAssets, eq(mediaAssets.id, articles.imageId))
    .where(and(eq(articles.slug, slug), eq(articles.status, "PUBLISHED"), isNull(articles.deletedAt)))
    .limit(1);
  if (!a) return {};
  return pageMetadata({
    path: `/news/${a.slug}`,
    title: a.title,
    description: a.excerpt,
    type: "article",
    publishedTime: a.publishedAt,
    image: a.imageKey ? `/api/media/${a.imageKey}` : STORY_IMAGES.communityCleanup.src,
    override: await seoOverrides("article", a.id),
  });
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [a] = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      body: articles.body,
      publishedAt: articles.publishedAt,
      category: categories.name,
      author: users.name,
      imageKey: mediaAssets.storageKey,
      imageAlt: mediaAssets.altText,
    })
    .from(articles)
    .leftJoin(categories, eq(categories.id, articles.categoryId))
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, articles.imageId))
    .where(and(eq(articles.slug, slug), eq(articles.status, "PUBLISHED"), isNull(articles.deletedAt)))
    .limit(1);

  if (!a) {
    await redirectIfMoved(`/news/${slug}`);
    notFound();
  }

  const [tagRows, more] = await Promise.all([
    db.select({ name: tags.name }).from(articleTags).innerJoin(tags, eq(tags.id, articleTags.tagId)).where(eq(articleTags.articleId, a.id)),
    db.select({ slug: articles.slug, title: articles.title, publishedAt: articles.publishedAt })
      .from(articles)
      .where(and(eq(articles.status, "PUBLISHED"), ne(articles.slug, slug), isNull(articles.deletedAt)))
      .orderBy(desc(articles.publishedAt)).limit(4),
  ]);

  const image = a.imageKey
    ? { src: `/api/media/${a.imageKey}`, alt: a.imageAlt ?? "", credit: "CMS upload" }
    : STORY_IMAGES.communityCleanup;

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["News", "/news"], [a.category ?? "Article"]]}
        eyebrow={`${formatDate(a.publishedAt)}${a.category ? ` / ${a.category}` : ""}`}
        title={a.title}
        lede={a.excerpt}
        image={image}
      />
      <section className="py-14"><div className="wrap grid gap-12 lg:grid-cols-[1fr_280px] items-start">
        <div className="prose-cg">
          <div className="aspect-video rounded-lg bg-[var(--color-surface-3)] grid place-items-center mb-7 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderSafeHtml(a.body) }} />
          {tagRows.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-7 pt-5 border-t border-[var(--color-line)]">
              {tagRows.map((t) => <span key={t.name} className="chip chip-mute chip-none">{t.name}</span>)}
            </div>
          )}
          {a.author && <p className="text-[0.82rem] text-[var(--color-ink-3)] mt-5">Written by {a.author}.</p>}
        </div>
        <aside className="card p-5 lg:sticky lg:top-28">
          <p className="eyebrow mb-3">More news</p>
          {more.length === 0 && <p className="text-[0.85rem] text-[var(--color-ink-3)] m-0">Nothing else yet.</p>}
          {more.map((m) => (
            <Link key={m.slug} href={`/news/${m.slug}`} className="block py-2.5 border-b border-[var(--color-line)] last:border-0 no-underline">
              <span className="block font-mono text-[0.68rem] text-[var(--color-ink-3)] mb-0.5">{formatDate(m.publishedAt)}</span>
              <span className="text-[0.86rem] text-[var(--color-ink)] font-medium">{m.title}</span>
            </Link>
          ))}
        </aside>
      </div></section>
    </>
  );
}
