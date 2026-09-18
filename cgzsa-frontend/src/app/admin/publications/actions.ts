"use server";

import { savePublication as savePublicationImpl } from "@/actions/admin/publications";

export async function savePublication(...args: Parameters<typeof savePublicationImpl>) {
  return savePublicationImpl(...args);
}
