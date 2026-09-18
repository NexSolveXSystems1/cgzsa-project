"use server";

import {
  inviteUser as inviteUserImpl,
  changeRole as changeRoleImpl,
  setUserStatus as setUserStatusImpl,
  setTemporaryPassword as setTemporaryPasswordImpl,
} from "@/actions/admin/users";

export async function inviteUser(...args: Parameters<typeof inviteUserImpl>) {
  return inviteUserImpl(...args);
}

export async function changeRole(...args: Parameters<typeof changeRoleImpl>) {
  return changeRoleImpl(...args);
}

export async function setUserStatus(...args: Parameters<typeof setUserStatusImpl>) {
  return setUserStatusImpl(...args);
}

export async function setTemporaryPassword(...args: Parameters<typeof setTemporaryPasswordImpl>) {
  return setTemporaryPasswordImpl(...args);
}
