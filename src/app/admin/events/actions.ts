"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireActor, requirePermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { recordRedirect } from "@/lib/content-actions";
import { buildPassages } from "@/lib/knowledge";
import { mayEdit } from "@/lib/ownership";

const Schema = z.object({
  title: z.string().trim().min(2, "Give the event a title.").max(200),
  slug: z.string().trim().max(120).optional(),
  summary: z.string().trim().min(10, "Describe the event.").max(4000),
  startsAt: z.string().min(1, "An event needs a start date and time."),
  endsAt: z.string().max(30).optional(),
  location: z.string().trim().min(2, "Where is it?").max(200),
  county: z.string().trim().max(80).optional(),
  registerUrl: z.string().trim().max(400).optional(),
  imageId: z.string().max(64).optional(),
});

export async function saveEvent(id: string | null, formData: FormData) {
  const actor = id ? await requireActor() : await requirePermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.registerUrl && !/^https?:\/\//i.test(d.registerUrl)) {
    return { error: "The registration link must start with http:// or https://" };
  }

  const slug = await uniqueSlug(d.slug || d.title, async (s) => {
    const [row] = await db.select({ id: events.id }).from(events)
      .where(id ? and(eq(events.slug, s), ne(events.id, id)) : eq(events.slug, s)).limit(1);
    return !!row;
  });

  const values = {
    title: d.title, slug, summary: d.summary,
    startsAt: new Date(d.startsAt), endsAt: d.endsAt ? new Date(d.endsAt) : null,
    location: d.location, county: d.county || null,
    registerUrl: d.registerUrl || null, imageId: d.imageId || null, updatedAt: new Date(),
  };

  if (id) {
    const [before] = await db.select().from(events).where(eq(events.id, id));
    if (!before) return { error: "That event no longer exists." };
  // Editing is gated on ownership, not on a blanket "edit others" permission.
  // content.create previously allowed creation only: editing anything, including
  // your own draft, required content.edit_others, which made the Contributor
  // role unusable. requireEdit() restores the rule the permission label
  // describes — your own work while it is still a draft, anyone's with
  // content.edit_others.
    if (!mayEdit(actor, before)) {
      return { error: "You can only edit your own drafts." };
    }
    await db.update(events).set(values).where(eq(events.id, id));
    if (before.slug !== slug && before.status === "PUBLISHED") await recordRedirect(`/events/${before.slug}`, `/events/${slug}`);
      revalidatePath(`/events/${before.slug}`);
      // Purge every cached entry for this route, so the old address stops
      // being served from the incremental cache and reaches the redirect.
      revalidatePath("/events/[slug]", "page");
    await audit(actor, ACTIONS.contentUpdate, `events:${id}`, d.title);
    if (before.status === "PUBLISHED") await buildPassages();
    revalidatePath("/admin/events"); revalidatePath("/events");
    return { ok: true };
  }
  const [created] = await db.insert(events).values({ ...values, authorId: actor.id, status: "DRAFT" }).returning({ id: events.id });
  await audit(actor, ACTIONS.contentCreate, `events:${created.id}`, d.title);
  revalidatePath("/admin/events");
  redirect(`/admin/events/${created.id}`);
}
