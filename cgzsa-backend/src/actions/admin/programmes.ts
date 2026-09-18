"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { requireActionActor, requireActionPermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { recordRedirect } from "@/lib/content-actions";
import { buildPassages } from "@/lib/knowledge";
import { mayEdit } from "@/lib/ownership";

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);

const Schema = z.object({
  title: z.string().trim().min(2, "Give the programme a title.").max(160),
  slug: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(120),
  lead: z.string().trim().min(10, "Write an opening paragraph.").max(2000),
  response: z.string().trim().max(2000),
  icon: z.enum(["waste", "water", "park", "bench", "flood"]),
  order: z.coerce.number().int().min(0).max(99),
  imageId: z.string().max(64).optional(),
});

export async function saveProgramme(id: string | null, formData: FormData) {
  const actor = id ? await requireActionActor() : await requireActionPermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const activities = lines(formData.get("activities"));
  const rationale = lines(formData.get("rationale"));
  const d = parsed.data;

  const slug = await uniqueSlug(d.slug || d.title, async (s) => {
    const [row] = await db.select({ id: programs.id }).from(programs)
      .where(id ? and(eq(programs.slug, s), ne(programs.id, id)) : eq(programs.slug, s)).limit(1);
    return !!row;
  });

  const values = {
    title: d.title, slug, tagline: d.tagline, lead: d.lead, response: d.response,
    icon: d.icon, order: d.order, activities, rationale,
    imageId: d.imageId || null, updatedAt: new Date(),
  };

  if (id) {
    const [before] = await db.select().from(programs).where(eq(programs.id, id));
    if (!before) return { error: "That programme no longer exists." };
  // Editing is gated on ownership, not on a blanket "edit others" permission.
  // content.create previously allowed creation only: editing anything, including
  // your own draft, required content.edit_others, which made the Contributor
  // role unusable. requireEdit() restores the rule the permission label
  // describes — your own work while it is still a draft, anyone's with
  // content.edit_others.
    if (!mayEdit(actor, before)) {
      return { error: "You can only edit your own drafts." };
    }
    await db.update(programs).set(values).where(eq(programs.id, id));
    if (before.slug !== slug && before.status === "PUBLISHED") {
      await recordRedirect(`/programs/${before.slug}`, `/programs/${slug}`);
      revalidatePath(`/programs/${before.slug}`);
      // Purge every cached entry for this route, so the old address stops
      // being served from the incremental cache and reaches the redirect.
      revalidatePath("/programs/[slug]", "page");
    }
    await audit(actor, ACTIONS.contentUpdate, `programmes:${id}`, d.title);
    await buildPassages();
    revalidatePath("/admin/programmes");
    revalidatePath("/programs");
    return { ok: true };
  }

  const [created] = await db.insert(programs).values({ ...values, authorId: actor.id, status: "DRAFT" }).returning({ id: programs.id });
  await audit(actor, ACTIONS.contentCreate, `programmes:${created.id}`, d.title);
  revalidatePath("/admin/programmes");
  redirect(`/admin/programmes/${created.id}`);
}
