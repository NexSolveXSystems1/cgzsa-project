"use client";

import { useTransition } from "react";
import { changeRole, setUserStatus } from "@/app/admin/users/actions";

export function UserRow({
  userId, roleId, status, roles, isSelf,
}: {
  userId: string; roleId: string; status: string;
  roles: { id: string; label: string }[];
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();

  if (isSelf) {
    return <span className="text-[0.78rem] text-[var(--color-ink-3)]">This is you</span>;
  }

  return (
    <div className="flex gap-2 justify-end items-center">
      <select
        aria-label="Role"
        defaultValue={roleId}
        disabled={pending}
        onChange={(e) => start(() => void changeRole(userId, e.target.value))}
        className="input max-w-[170px] py-1.5 text-[0.8rem]"
      >
        {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      <button
        className="btn btn-ghost btn-xs"
        disabled={pending}
        onClick={() => start(() => void setUserStatus(userId, status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"))}
      >
        {status === "SUSPENDED" ? "Reinstate" : "Suspend"}
      </button>
    </div>
  );
}
