"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireActor, requirePermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { recordRedirect } from "@/lib/content-actions";
import { buildPassages } from "@/lib/knowledge";
import { mayEdit } from "@/lib/ownership";

const Schema = z.object({
  title: z.string().trim().min(2, "Give the project a name.").max(200),
  slug: z.string().trim().max(120).optional(),
  summary: z.string().trim().min(10, "Describe the project.").max(4000),
  county: z.string().trim().max(80).optional(),
  location: z.string().trim().max(200).optional(),
  projectStatus: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]),
  programId: z.string().max(64).optional(),
  startDate: z.string().max(30).optional(),
  endDate: z.string().max(30).optional(),
});

export async function saveProject(id: string | null, formData: FormData) {
  const actor = id ? await requireActor() : await requirePermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const objectives = String(formData.get("objectives") ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const slug = await uniqueSlug(d.slug || d.title, async (s) => {
    const [row] = await db.select({ id: projects.id }).from(projects)
      .where(id ? and(eq(projects.slug, s), ne(projects.id, id)) : eq(projects.slug, s)).limit(1);
    return !!row;
  });

  const values = {
    title: d.title, slug, summary: d.summary, objectives,
    county: d.county || null, location: d.location || null,
    projectStatus: d.projectStatus, programId: d.programId || null,
    startDate: d.startDate ? new Date(d.startDate) : null,
    endDate: d.endDate ? new Date(d.endDate) : null,
    updatedAt: new Date(),
  };

  if (id) {
    const [before] = await db.select().from(projects).where(eq(projects.id, id));
    if (!before) return { error: "That project no longer exists." };
  // Editing is gated on ownership, not on a blanket "edit others" permission.
  // content.create previously allowed creation only: editing anything, including
  // your own draft, required content.edit_others, which made the Contributor
  // role unusable. requireEdit() restores the rule the permission label
  // describes — your own work while it is still a draft, anyone's with
  // content.edit_others.
    if (!mayEdit(actor, before)) {
      return { error: "You can only edit your own drafts." };
    }
    await db.update(projects).set(values).where(eq(projects.id, id));
    if (before.slug !== slug && before.status === "PUBLISHED") await recordRedirect(`/projects/${before.slug}`, `/projects/${slug}`);
      revalidatePath(`/projects/${before.slug}`);
      // Purge every cached entry for this route, so the old address stops
      // being served from the incremental cache and reaches the redirect.
      revalidatePath("/projects/[slug]", "page");
    await audit(actor, ACTIONS.contentUpdate, `projects:${id}`, d.title);
    if (before.status === "PUBLISHED") await buildPassages();
    revalidatePath("/admin/projects"); revalidatePath("/projects");
    return { ok: true };
  }
  const [created] = await db.insert(projects).values({ ...values, authorId: actor.id, status: "DRAFT" }).returning({ id: projects.id });
  await audit(actor, ACTIONS.contentCreate, `projects:${created.id}`, d.title);
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${created.id}`);
}
