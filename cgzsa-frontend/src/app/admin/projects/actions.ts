"use server";

import { saveProject as saveProjectImpl } from "@/actions/admin/projects";

export async function saveProject(...args: Parameters<typeof saveProjectImpl>) {
  return saveProjectImpl(...args);
}
