"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { articleRevisions, articleTags, articles, categories, tags } from "@/db/schema";
import { requireActor, requirePermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { sanitiseHtml, htmlToText } from "@/lib/sanitise";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordRedirect, saveRevision } from "@/lib/content-actions";
import { buildPassages } from "@/lib/knowledge";
import { mayEdit } from "@/lib/ownership";

const Schema = z.object({
  title: z.string().trim().min(2, "Give the article a title.").max(200),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().min(10, "Write a short summary — it is used on cards and in search results.").max(400),
  body: z.string().max(200_000),
  categoryId: z.string().max(64).optional(),
  imageId: z.string().max(64).optional(),
  tags: z.string().max(400).optional(),
  publishAt: z.string().max(30).optional(),
});

export async function saveArticle(id: string | null, formData: FormData) {
  const actor = id ? await requireActor() : await requirePermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, excerpt } = parsed.data;
  const body = sanitiseHtml(parsed.data.body);
  const categoryId = parsed.data.categoryId || null;
  const imageId = parsed.data.imageId || null;
  const publishAt = parsed.data.publishAt ? new Date(parsed.data.publishAt) : null;

  const slug = await uniqueSlug(parsed.data.slug || title, async (s) => {
    const [row] = await db.select({ id: articles.id }).from(articles)
      .where(id ? and(eq(articles.slug, s), ne(articles.id, id)) : eq(articles.slug, s)).limit(1);
    return !!row;
  });

  let articleId = id;
  if (id) {
    const [before] = await db.select().from(articles).where(eq(articles.id, id));
    if (!before) return { error: "That article no longer exists." };
  // Editing is gated on ownership, not on a blanket "edit others" permission.
  // content.create previously allowed creation only: editing anything, including
  // your own draft, required content.edit_others, which made the Contributor
  // role unusable. requireEdit() restores the rule the permission label
  // describes — your own work while it is still a draft, anyone's with
  // content.edit_others.
    if (!mayEdit(actor, before)) {
      return { error: "You can only edit your own drafts." };
    }
    await saveRevision("article", id, { title: before.title, body: before.body, authorId: actor.id });
    await db.update(articles)
      .set({ title, slug, excerpt, body, categoryId, imageId, publishAt, updatedAt: new Date() })
      .where(eq(articles.id, id));
    if (before.slug !== slug && before.status === "PUBLISHED") {
      await recordRedirect(`/news/${before.slug}`, `/news/${slug}`);
    }
    // Always, not only on a slug change: the text itself has changed, so the
    // cached copy at the old address must go. Purging the route entry as well
    // stops a moved page being served from the incremental cache instead of
    // reaching the redirect.
    revalidatePath(`/news/${before.slug}`);
    revalidatePath("/news/[slug]", "page");
    await audit(actor, ACTIONS.contentUpdate, `news:${id}`, title);
    if (before.status === "PUBLISHED") await buildPassages();
  } else {
    const [created] = await db.insert(articles)
      .values({ title, slug, excerpt: excerpt || htmlToText(body).slice(0, 200), body, categoryId, imageId, publishAt, authorId: actor.id, status: "DRAFT" })
      .returning({ id: articles.id });
    articleId = created.id;
    await audit(actor, ACTIONS.contentCreate, `news:${created.id}`, title);
  }

  // Tags are free text, created on demand.
  if (articleId) {
    const wanted = (parsed.data.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12);
    await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
    for (const name of wanted) {
      const slugged = slugify(name);
      if (!slugged) continue;
      const [tag] = await db.insert(tags).values({ slug: slugged, name })
        .onConflictDoUpdate({ target: tags.slug, set: { name } }).returning({ id: tags.id });
      await db.insert(articleTags).values({ articleId, tagId: tag.id }).onConflictDoNothing();
    }
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  if (!id && articleId) redirect(`/admin/news/${articleId}`);
  return { ok: true };
}

export async function ensureCategory(name: string) {
  await requirePermission("content.create");
  const slug = slugify(name);
  const [row] = await db.insert(categories).values({ slug, name })
    .onConflictDoUpdate({ target: categories.slug, set: { name } }).returning();
  return row;
}

/**
 * Restoring an earlier version copies the current text forward as a new
 * revision first, so nothing an editor wrote is ever destroyed by a restore.
 * Same rule as the page editor.
 */
export async function restoreArticleRevision(articleId: string, revisionId: string) {
  const actor = await requirePermission("content.edit_others");
  const [rev] = await db.select().from(articleRevisions).where(eq(articleRevisions.id, revisionId));
  if (!rev) return;
  const [before] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!before) return;

  await saveRevision("article", articleId, { title: before.title, body: before.body, authorId: actor.id });
  await db.update(articles)
    .set({ title: rev.title, body: rev.body, updatedAt: new Date() })
    .where(eq(articles.id, articleId));
  await audit(actor, ACTIONS.contentUpdate, `articles:${articleId}`, `Restored version ${rev.version}`);
  revalidatePath(`/admin/news/${articleId}`);
}
