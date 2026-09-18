"use server";

import { saveTeamMember as saveTeamMemberImpl } from "@/actions/admin/team";

export async function saveTeamMember(...args: Parameters<typeof saveTeamMemberImpl>) {
  return saveTeamMemberImpl(...args);
}
