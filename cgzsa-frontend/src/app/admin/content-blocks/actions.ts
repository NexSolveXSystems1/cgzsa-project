"use server";

import { saveContentBlock as saveContentBlockImpl } from "@/actions/admin/content-blocks";

export async function saveContentBlock(...args: Parameters<typeof saveContentBlockImpl>) {
  return saveContentBlockImpl(...args);
}
