"use server";

import {
  setMessageStatus as setMessageStatusImpl,
  setApplicationStatus as setApplicationStatusImpl,
  erasePersonalRecord as erasePersonalRecordImpl,
} from "@/actions/admin/messages";

export async function setMessageStatus(...args: Parameters<typeof setMessageStatusImpl>) {
  return setMessageStatusImpl(...args);
}

export async function setApplicationStatus(...args: Parameters<typeof setApplicationStatusImpl>) {
  return setApplicationStatusImpl(...args);
}

export async function erasePersonalRecord(...args: Parameters<typeof erasePersonalRecordImpl>) {
  return erasePersonalRecordImpl(...args);
}
