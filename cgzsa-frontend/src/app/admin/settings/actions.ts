"use server";

import {
  saveSiteSettings as saveSiteSettingsImpl,
  saveAssistantSettings as saveAssistantSettingsImpl,
} from "@/actions/admin/settings";

export async function saveSiteSettings(...args: Parameters<typeof saveSiteSettingsImpl>) {
  return saveSiteSettingsImpl(...args);
}

export async function saveAssistantSettings(...args: Parameters<typeof saveAssistantSettingsImpl>) {
  return saveAssistantSettingsImpl(...args);
}
