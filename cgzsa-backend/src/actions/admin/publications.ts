"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { publicationCategories, publications } from "@/db/schema";
import { requireActionActor, requireActionPermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { slugify, uniqueSlug } from "@/lib/slug";
import { buildPassages } from "@/lib/knowledge";
import { mayEdit } from "@/lib/ownership";

const Schema = z.object({
  title: z.string().trim().min(2, "Give the document a title.").max(200),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  categoryName: z.string().trim().max(80).optional(),
  fileId: z.string().max(64).optional(),
  publishedOn: z.string().max(30).optional(),
  allowDownload: z.string().optional(),
});

export async function savePublication(id: string | null, formData: FormData) {
  const actor = id ? await requireActionActor() : await requireActionPermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let categoryId: string | null = null;
  if (d.categoryName) {
    const [cat] = await db.insert(publicationCategories)
      .values({ slug: slugify(d.categoryName), name: d.categoryName })
      .onConflictDoUpdate({ target: publicationCategories.slug, set: { name: d.categoryName } })
      .returning({ id: publicationCategories.id });
    categoryId = cat.id;
  }

  const slug = await uniqueSlug(d.slug || d.title, async (s) => {
    const [row] = await db.select({ id: publications.id }).from(publications)
      .where(id ? and(eq(publications.slug, s), ne(publications.id, id)) : eq(publications.slug, s)).limit(1);
    return !!row;
  });

  const values = {
    title: d.title, slug, description: d.description || null, categoryId,
    fileId: d.fileId || null,
    publishedOn: d.publishedOn ? new Date(d.publishedOn) : null,
    allowDownload: d.allowDownload === "on",
    updatedAt: new Date(),
  };

  if (id) {
    const [before] = await db.select().from(publications).where(eq(publications.id, id));
    if (!before) return { error: "That publication no longer exists." };
    // Editing is gated on ownership, not on a blanket "edit others" permission.
    // content.create previously allowed creation only: editing anything,
    // including your own draft, required content.edit_others, which made the
    // Contributor role unusable. See cgzsa-backend/src/lib/ownership.ts.
    if (!mayEdit(actor, before)) {
      return { error: "You can only edit your own drafts." };
    }
    await db.update(publications).set(values).where(eq(publications.id, id));
    await audit(actor, ACTIONS.contentUpdate, `publications:${id}`, d.title);
    await buildPassages();
    revalidatePath("/admin/publications"); revalidatePath("/resources/publications");
    return { ok: true };
  }
  const [created] = await db.insert(publications).values({ ...values, authorId: actor.id, status: "DRAFT" }).returning({ id: publications.id });
  await audit(actor, ACTIONS.contentCreate, `publications:${created.id}`, d.title);
  revalidatePath("/admin/publications");
  redirect(`/admin/publications/${created.id}`);
}
