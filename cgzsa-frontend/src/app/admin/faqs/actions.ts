"use server";

import { saveFaq as saveFaqImpl } from "@/actions/admin/faqs";

export async function saveFaq(...args: Parameters<typeof saveFaqImpl>) {
  return saveFaqImpl(...args);
}
