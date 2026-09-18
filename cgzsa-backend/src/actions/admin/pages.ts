"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages, pageRevisions } from "@/db/schema";
import { requireActionActor, requireActionPermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { sanitiseHtml, htmlToText } from "@/lib/sanitise";
import { slugifyPath, uniquePathSlug } from "@/lib/slug";
import { recordRedirect, saveRevision } from "@/lib/content-actions";
import { buildPassages } from "@/lib/knowledge";
import { saveSeoMeta } from "@/lib/seo";
import { mayEdit } from "@/lib/ownership";

const Schema = z.object({
  title: z.string().trim().min(2, "Give the page a title.").max(200),
  slug: z.string().trim().max(120).optional(),
  section: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().max(200_000),
  imageId: z.string().trim().max(64).optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(400).optional(),
  seoCanonical: z.string().trim().max(400).optional(),
  seoNoindex: z.string().optional(),
});

export async function savePage(id: string | null, formData: FormData) {
  const actor = id ? await requireActionActor() : await requireActionPermission("content.create");

  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, section, excerpt, imageId, seoTitle, seoDescription, seoCanonical, seoNoindex } = parsed.data;
  const body = sanitiseHtml(parsed.data.body);

  const wanted = slugifyPath(parsed.data.slug || title);
  const slug = await uniquePathSlug(wanted, async (s) => {
    const [row] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(id ? and(eq(pages.slug, s), ne(pages.id, id)) : eq(pages.slug, s))
      .limit(1);
    return !!row;
  });

  if (id) {
    const [before] = await db.select().from(pages).where(eq(pages.id, id));
    if (!before) return { error: "That page no longer exists." };
    if (!mayEdit(actor, before)) {
      return { error: "You can only edit your own drafts." };
    }

    // History first, so a mistake is always recoverable.
    await saveRevision("page", id, { title: before.title, body: before.body, authorId: actor.id });

    await db.update(pages).set({
      title,
      slug,
      section: section || null,
      excerpt: excerpt || null,
      imageId: imageId || null,
      body,
      updatedAt: new Date(),
    }).where(eq(pages.id, id));
    await saveSeoMeta("page", id, {
      title: seoTitle || null,
      description: seoDescription || null,
      canonical: seoCanonical || null,
      noindex: seoNoindex === "on",
    });

    if (before.slug !== slug && before.status === "PUBLISHED") await recordRedirect(`/${before.slug}`, `/${slug}`);
    await audit(actor, ACTIONS.contentUpdate, `pages:${id}`, title);
    if (before.status === "PUBLISHED") await buildPassages();
    revalidatePath("/admin/pages");
    revalidatePath(`/${slug}`);
    return { ok: true };
  }

  const [created] = await db
    .insert(pages)
    .values({
      title,
      slug,
      section: section || null,
      excerpt: excerpt || htmlToText(body).slice(0, 200),
      imageId: imageId || null,
      body,
      authorId: actor.id,
      status: "DRAFT",
    })
    .returning({ id: pages.id });
  await saveSeoMeta("page", created.id, {
    title: seoTitle || null,
    description: seoDescription || null,
    canonical: seoCanonical || null,
    noindex: seoNoindex === "on",
  });
  await audit(actor, ACTIONS.contentCreate, `pages:${created.id}`, title);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${created.id}`);
}

export async function restoreRevision(pageId: string, revisionId: string) {
  const actor = await requireActionPermission("content.edit_others");
  const [rev] = await db.select().from(pageRevisions).where(eq(pageRevisions.id, revisionId));
  if (!rev) return;
  const [before] = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!before) return;

  // Restoring is a copy-forward, never a destructive rollback.
  await saveRevision("page", pageId, { title: before.title, body: before.body, authorId: actor.id });
  await db.update(pages).set({ title: rev.title, body: rev.body, updatedAt: new Date() }).where(eq(pages.id, pageId));
  await audit(actor, ACTIONS.contentUpdate, `pages:${pageId}`, `Restored version ${rev.version}`);
  revalidatePath(`/admin/pages/${pageId}`);
}
