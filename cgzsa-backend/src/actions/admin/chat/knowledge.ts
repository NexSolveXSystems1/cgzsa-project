"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { faqs, unansweredQuestions } from "@/db/schema";
import { requireActionPermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { buildPassages } from "@/lib/knowledge";

export async function reindex() {
  const actor = await requireActionPermission("knowledge.edit");
  const r = await buildPassages();
  await audit(actor, ACTIONS.knowledgeReindex, "knowledge", `${r.sources} sources, ${r.passages} passages`);
  revalidatePath("/admin/chat/knowledge");
}

const Answer = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(10, "Write an answer the assistant can quote.").max(4000),
});

/** Turn a question the assistant could not answer into a published FAQ. */
export async function answerGap(questionId: string, formData: FormData) {
  const actor = await requireActionPermission("knowledge.edit");
  const parsed = Answer.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const canPublish = actor.permissions.has("content.publish");
  await db.insert(faqs).values({
    question: parsed.data.question,
    answer: parsed.data.answer,
    order: 99,
    status: canPublish ? "PUBLISHED" : "DRAFT",
  });
  await db.update(unansweredQuestions)
    .set({ resolvedAt: new Date(), resolution: canPublish ? "Answered and published" : "Answered, awaiting review" })
    .where(eq(unansweredQuestions.id, questionId));

  await buildPassages();
  await audit(actor, ACTIONS.contentCreate, `faqs:from-gap`, parsed.data.question);
  revalidatePath("/admin/chat/knowledge");
  revalidatePath("/resources/faqs");
  return { ok: true };
}

export async function ignoreGap(questionId: string) {
  const actor = await requireActionPermission("knowledge.edit");
  await db.update(unansweredQuestions)
    .set({ resolvedAt: new Date(), resolution: "Ignored" })
    .where(eq(unansweredQuestions.id, questionId));
  await audit(actor, ACTIONS.contentUpdate, `unanswered:${questionId}`, "Ignored");
  revalidatePath("/admin/chat/knowledge");
}
