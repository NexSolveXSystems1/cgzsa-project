"use server";

import { saveEvent as saveEventImpl } from "@/actions/admin/events";

export async function saveEvent(...args: Parameters<typeof saveEventImpl>) {
  return saveEventImpl(...args);
}
