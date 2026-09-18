"use server";

import { saveProgramme as saveProgrammeImpl } from "@/actions/admin/programmes";

export async function saveProgramme(...args: Parameters<typeof saveProgrammeImpl>) {
  return saveProgrammeImpl(...args);
}
