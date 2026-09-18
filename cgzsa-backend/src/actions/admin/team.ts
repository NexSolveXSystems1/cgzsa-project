"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { requireActionPermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().trim().max(160).optional(),
  role: z.string().trim().min(2, "Give the role a name.").max(160),
  group: z.string().trim().min(2).max(80),
  biography: z.string().trim().max(4000).optional(),
  photoId: z.string().max(64).optional(),
  order: z.coerce.number().int().min(0).max(999),
});

export async function saveTeamMember(id: string | null, formData: FormData) {
  const actor = await requireActionPermission("team.manage");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const duties = String(formData.get("duties") ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const name = d.name?.trim() || null;

  const values = {
    name, role: d.role, group: d.group, duties,
    biography: d.biography || null, photoId: d.photoId || null,
    order: d.order, vacant: !name, updatedAt: new Date(),
  };

  if (id) {
    await db.update(teamMembers).set(values).where(eq(teamMembers.id, id));
    await audit(actor, ACTIONS.contentUpdate, `team:${id}`, `${d.role}${name ? ` — ${name}` : " (vacant)"}`);
  } else {
    const [created] = await db.insert(teamMembers).values(values).returning({ id: teamMembers.id });
    await audit(actor, ACTIONS.contentCreate, `team:${created.id}`, d.role);
  }
  revalidatePath("/admin/team");
  revalidatePath("/about/leadership");
  return { ok: true };
}
