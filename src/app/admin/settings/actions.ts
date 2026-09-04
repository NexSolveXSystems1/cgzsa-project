"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assistantSettings, siteSettings } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { ACTIONS, audit } from "@/lib/audit";
import { bustSettingsCache } from "@/lib/settings";

const url = z.string().trim().max(400).optional().refine(
  (v) => !v || /^https?:\/\//i.test(v),
  "Links must start with http:// or https://",
);

const Site = z.object({
  orgName: z.string().trim().min(2).max(200),
  shortName: z.string().trim().min(1).max(40),
  motto: z.string().trim().max(200),
  strapline: z.string().trim().max(200),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  contactRecipient: z.string().trim().email("Enter a valid recipient address.").max(200),
  phone1: z.string().trim().max(40),
  phone2: z.string().trim().max(40).optional(),
  phone3: z.string().trim().max(40).optional(),
  office: z.string().trim().max(400),
  registeredSeat: z.string().trim().max(200),
  officeHours: z.string().trim().max(200).optional(),
  registrationNo: z.string().trim().max(60).optional(),
  showRegistrationNo: z.string().optional(),
  facebookUrl: url, twitterUrl: url, instagramUrl: url, linkedinUrl: url, youtubeUrl: url,
  canonicalDomain: z.string().trim().max(200),
  titleTemplate: z.string().trim().max(120),
  defaultDescription: z.string().trim().max(400),
  impactBandLabel: z.string().trim().max(120),
  logoId: z.string().trim().optional(),
});

export async function saveSiteSettings(formData: FormData) {
  const actor = await requirePermission("settings.manage");
  const parsed = Site.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await db.update(siteSettings).set({
    ...d,
    phone2: d.phone2 || null, phone3: d.phone3 || null,
    officeHours: d.officeHours || null, registrationNo: d.registrationNo || null,
    showRegistrationNo: d.showRegistrationNo === "on",
    facebookUrl: d.facebookUrl || null, twitterUrl: d.twitterUrl || null,
    instagramUrl: d.instagramUrl || null, linkedinUrl: d.linkedinUrl || null, youtubeUrl: d.youtubeUrl || null,
    logoId: d.logoId || null,
    updatedAt: new Date(),
  }).where(eq(siteSettings.id, "singleton"));

  bustSettingsCache();
  await audit(actor, ACTIONS.settingsUpdate, "site_settings", "Site settings updated");
  revalidatePath("/", "layout");
  return { ok: true };
}

const Assistant = z.object({
  assistantName: z.string().trim().min(2).max(80),
  tone: z.string().trim().max(60),
  greeting: z.string().trim().min(10, "Write an opening message.").max(600),
  handoverMessage: z.string().trim().min(10, "Write the message shown when it hands over.").max(600),
  neverDiscuss: z.string().trim().max(600).optional(),
  confidenceThreshold: z.coerce.number().min(0).max(1),
  maxRepliesPerConversation: z.coerce.number().int().min(1).max(20),
  monthlyCapUsd: z.coerce.number().min(0).max(10_000),
  officeOpen: z.string().max(5),
  officeClose: z.string().max(5),
  officeDays: z.string().trim().max(80),
  enabled: z.string().optional(),
  showSources: z.string().optional(),
  handOverWhenUnsure: z.string().optional(),
  captureEmailOutOfHours: z.string().optional(),
});

export async function saveAssistantSettings(formData: FormData) {
  const actor = await requirePermission("assistant.configure");
  const parsed = Assistant.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await db.update(assistantSettings).set({
    assistantName: d.assistantName,
    tone: d.tone,
    greeting: d.greeting,
    handoverMessage: d.handoverMessage,
    neverDiscuss: (d.neverDiscuss ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
    confidenceThreshold: d.confidenceThreshold,
    maxRepliesPerConversation: d.maxRepliesPerConversation,
    monthlyCapUsd: d.monthlyCapUsd,
    officeOpen: d.officeOpen, officeClose: d.officeClose, officeDays: d.officeDays,
    enabled: d.enabled === "on",
    showSources: d.showSources === "on",
    handOverWhenUnsure: d.handOverWhenUnsure === "on",
    captureEmailOutOfHours: d.captureEmailOutOfHours === "on",
    // restrictToContent is deliberately absent: it is enforced, not configurable.
    updatedAt: new Date(),
  }).where(eq(assistantSettings.id, "singleton"));

  bustSettingsCache();
  await audit(actor, ACTIONS.assistantUpdate, "assistant_settings", `Assistant ${d.enabled === "on" ? "on" : "off"}`);
  revalidatePath("/", "layout");
  revalidatePath("/admin/chat/assistant");
  return { ok: true };
}
