"use server";

import {
  savePage as savePageImpl,
  restoreRevision as restoreRevisionImpl,
} from "@/actions/admin/pages";

export async function savePage(...args: Parameters<typeof savePageImpl>) {
  return savePageImpl(...args);
}

export async function restoreRevision(...args: Parameters<typeof restoreRevisionImpl>) {
  return restoreRevisionImpl(...args);
}
