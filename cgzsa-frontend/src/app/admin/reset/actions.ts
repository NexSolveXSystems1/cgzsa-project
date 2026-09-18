"use server";

import {
  requestReset as requestResetImpl,
  completeReset as completeResetImpl,
} from "@/actions/admin/reset";

export async function requestReset(...args: Parameters<typeof requestResetImpl>) {
  return requestResetImpl(...args);
}

export async function completeReset(...args: Parameters<typeof completeResetImpl>) {
  return completeResetImpl(...args);
}
