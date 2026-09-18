"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contentBlocks } from "@/db/schema";
import { requireActionActor, requireActionPermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { sanitiseHtml } from "@/lib/sanitise";
import { buildPassages } from "@/lib/knowledge";
import { mayEdit } from "@/lib/ownership";
import { isLocalPath } from "@/lib/url";

const key = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:[./-][a-z0-9]+)*$/, "Use lowercase letters, numbers, dots, dashes or slashes.");

const href = z.string().trim().max(400).optional().refine(
  (value) => !value || isLocalPath(value) || /^https?:\/\//i.test(value),
  "CTA links must be local paths or start with http:// or https://",
);

const Schema = z.object({
  page: key,
  slot: key,
  label: z.string().trim().min(2, "Give the block a label.").max(120),
  eyebrow: z.string().trim().max(120).optional(),
  title: z.string().trim().min(2, "Give the block a title.").max(200),
  body: z.string().max(100_000),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaHref: href,
  imageId: z.string().trim().max(64).optional(),
  order: z.coerce.number().int().min(0).max(999),
});

function publicPath(page: string) {
  return page === "home" ? "/" : `/${page}`;
}

export async function saveContentBlock(id: string | null, formData: FormData) {
  const actor = id ? await requireActionActor() : await requireActionPermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const values = {
    page: d.page,
    slot: d.slot,
    label: d.label,
    eyebrow: d.eyebrow || null,
    title: d.title,
    body: sanitiseHtml(d.body),
    ctaLabel: d.ctaLabel || null,
    ctaHref: d.ctaHref || null,
    imageId: d.imageId || null,
    order: d.order,
    updatedAt: new Date(),
  };

  if (id) {
    const [before] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).limit(1);
    if (!before) return { error: "That content block no longer exists." };
    if (!mayEdit(actor, before)) return { error: "You can only edit your own drafts." };

    const [duplicate] = await db
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.page, d.page), eq(contentBlocks.slot, d.slot), ne(contentBlocks.id, id)))
      .limit(1);
    if (duplicate) return { error: "That page and slot already exist." };

    await db.update(contentBlocks).set(values).where(eq(contentBlocks.id, id));
    await audit(actor, ACTIONS.contentUpdate, `content_blocks:${id}`, d.label);
    if (before.status === "PUBLISHED") await buildPassages();
  } else {
    const [created] = await db
      .insert(contentBlocks)
      .values({ ...values, authorId: actor.id, status: "DRAFT" })
      .returning({ id: contentBlocks.id });
    await audit(actor, ACTIONS.contentCreate, `content_blocks:${created.id}`, d.label);
  }

  revalidatePath("/admin/content-blocks");
  revalidatePath(publicPath(d.page));
  return { ok: true };
}
