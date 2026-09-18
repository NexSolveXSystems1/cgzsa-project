"use server";

import {
  beginTotpEnrolment as beginTotpEnrolmentImpl,
  confirmTotp as confirmTotpImpl,
  disableTotp as disableTotpImpl,
  changePassword as changePasswordImpl,
  revokeOtherSessions as revokeOtherSessionsImpl,
} from "@/actions/admin/account";

export async function beginTotpEnrolment(...args: Parameters<typeof beginTotpEnrolmentImpl>) {
  return beginTotpEnrolmentImpl(...args);
}

export async function confirmTotp(...args: Parameters<typeof confirmTotpImpl>) {
  return confirmTotpImpl(...args);
}

export async function disableTotp(...args: Parameters<typeof disableTotpImpl>) {
  return disableTotpImpl(...args);
}

export async function changePassword(...args: Parameters<typeof changePasswordImpl>) {
  return changePasswordImpl(...args);
}

export async function revokeOtherSessions(...args: Parameters<typeof revokeOtherSessionsImpl>) {
  return revokeOtherSessionsImpl(...args);
}
