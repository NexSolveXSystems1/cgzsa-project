"use client";

import { useActionState, useTransition } from "react";
import { changeRole, setTemporaryPassword, setUserStatus } from "@/app/admin/users/actions";

type Result = { ok?: boolean; error?: string } | undefined;

export function UserRow({
  userId, roleId, status, roles, isSelf, canManage,
}: {
  userId: string; roleId: string; status: string;
  roles: { id: string; label: string }[];
  isSelf: boolean;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [passwordState, passwordAction, passwordPending] = useActionState<Result, FormData>(
    async (_prev, formData) => (await setTemporaryPassword(userId, formData)) ?? undefined,
    undefined,
  );

  if (isSelf) {
    return <span className="text-[0.78rem] text-[var(--color-ink-3)]">This is you</span>;
  }

  if (!canManage) {
    return <span className="text-[0.78rem] text-[var(--color-ink-3)]">Protected</span>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
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
      <form action={passwordAction} className="flex flex-wrap justify-end gap-2 max-w-[320px]">
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Temporary password"
          className="input max-w-[184px] py-1.5 text-[0.8rem]"
          minLength={12}
        />
        <button className="btn btn-ghost btn-xs" disabled={passwordPending}>
          {passwordPending ? "Setting..." : "Set password"}
        </button>
        {passwordState?.error ? <span role="alert" className="basis-full text-right text-[0.74rem] text-[var(--color-danger)]">{passwordState.error}</span> : null}
        {passwordState?.ok ? <span role="status" className="basis-full text-right text-[0.74rem] text-[var(--color-brand)]">Password set.</span> : null}
      </form>
    </div>
  );
}
