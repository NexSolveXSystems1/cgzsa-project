"use client";

import Link from "next/link";
import { useActionState } from "react";
import { completeReset, requestReset } from "@/app/admin/reset/actions";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<{ ok?: boolean } | null, FormData>(
    async (_p, fd) => (await requestReset(fd)) ?? null, null);

  if (state?.ok) {
    return (
      <p className="text-[0.88rem] text-[var(--color-ink-2)] text-center">
        If there is an account with that address, a reset link is on its way. Check your inbox.
      </p>
    );
  }

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send the link"}
      </button>
    </form>
  );
}

export function ResetCompleteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<{ ok?: boolean; error?: string } | null, FormData>(
    async (_p, fd) => (await completeReset(token, fd)) ?? null, null);

  if (state?.ok) {
    return (
      <div className="text-center">
        <p className="text-[0.88rem] text-[var(--color-ink-2)] mb-4">Your password has been changed.</p>
        <Link href="/admin" className="btn btn-primary w-full">Sign in</Link>
      </div>
    );
  }

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className="input" />
      </div>
      {state?.error && <p role="alert" className="text-[0.82rem] text-[var(--color-danger)] mb-3.5">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Set the password"}
      </button>
    </form>
  );
}
