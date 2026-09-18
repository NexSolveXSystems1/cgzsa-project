"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions";

type State = { error?: string; needsToken?: boolean } | null;

export function SignInForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => ((await signIn(_prev, formData)) as State) ?? null,
    null,
  );
  const stage2 = state?.needsToken;

  return (
    <form action={action}>
      <div className="field" hidden={stage2}>
        <label htmlFor="email">Email address</label>
        {/* Never pre-filled: a default here would hand a valid account name to
            anyone who opens the sign-in page. */}
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </div>
      <div className="field" hidden={stage2}>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>

      {stage2 && (
        <div className="field">
          <label htmlFor="token">Six-digit code</label>
          <input id="token" name="token" inputMode="numeric" maxLength={6} autoFocus
            placeholder="000000" className="input font-mono text-center text-lg tracking-[0.3em]" />
          <div className="hint">From the authenticator app on your phone.</div>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-[0.82rem] text-[var(--color-danger)] mb-3.5">{state.error}</p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : stage2 ? "Verify and continue" : "Sign in"}
      </button>
    </form>
  );
}
