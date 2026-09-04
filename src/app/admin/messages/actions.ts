"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, volunteerApplications } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Status = "UNREAD" | "READ" | "REPLIED" | "ARCHIVED";

export async function setMessageStatus(id: string, status: Status) {
  const actor = await requirePermission("messages.read");
  await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id));
  await audit(actor, "message.status", `contact_message:${id}`, status);
  revalidatePath("/admin/messages");
}

export async function setApplicationStatus(id: string, status: Status) {
  const actor = await requirePermission("messages.read");
  await db.update(volunteerApplications).set({ status }).where(eq(volunteerApplications.id, id));
  await audit(actor, "application.status", `volunteer_application:${id}`, status);
  revalidatePath("/admin/volunteers");
}

/** A subject request: remove the record entirely rather than soft-deleting it. */
export async function erasePersonalRecord(kind: "message" | "application", id: string) {
  const actor = await requirePermission("messages.read");
  if (kind === "message") await db.delete(contactMessages).where(eq(contactMessages.id, id));
  else await db.delete(volunteerApplications).where(eq(volunteerApplications.id, id));
  await audit(actor, "personal_data.erase", `${kind}:${id}`, "Erased at the subject's request");
  revalidatePath("/admin/messages");
  revalidatePath("/admin/volunteers");
}
