"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { buildPassages } from "@/lib/knowledge";

const Schema = z.object({
  question: z.string().trim().min(5, "Write the question.").max(300),
  answer: z.string().trim().min(10, "Write the answer.").max(4000),
  order: z.coerce.number().int().min(0).max(999),
});

export async function saveFaq(id: string | null, formData: FormData) {
  const actor = await requirePermission("content.create");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (id) {
    await db.update(faqs).set({ ...d, updatedAt: new Date() }).where(eq(faqs.id, id));
    await audit(actor, ACTIONS.contentUpdate, `faqs:${id}`, d.question);
  } else {
    const [created] = await db.insert(faqs).values({ ...d, status: "DRAFT" }).returning({ id: faqs.id });
    await audit(actor, ACTIONS.contentCreate, `faqs:${created.id}`, d.question);
  }
  await buildPassages();
  revalidatePath("/admin/faqs");
  revalidatePath("/resources/faqs");
  return { ok: true };
}
