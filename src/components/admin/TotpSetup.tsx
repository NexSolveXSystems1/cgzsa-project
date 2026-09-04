"use client";

import { useState, useTransition } from "react";
import { beginTotpEnrolment, confirmTotp, disableTotp } from "@/app/admin/account/actions";

export function TotpSetup({ enabled, email }: { enabled: boolean; email: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(enabled);
  const [removing, setRemoving] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div>
        <p className="text-[0.87rem] text-[var(--color-ink-2)] mb-3">
          <span className="chip chip-ok">On</span> Two-factor authentication is active on this account.
        </p>

        {!removing ? (
          <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => { setError(null); setRemoving(true); }}>
            Turn it off
          </button>
        ) : (
          // Removing the second factor needs the password and a live code, so a
          // stolen session on its own cannot strip it.
          <form
            action={(fd) =>
              start(async () => {
                const r = await disableTotp(fd);
                if (r?.error) setError(r.error);
                else { setError(null); setDone(false); setSecret(null); setRemoving(false); }
              })
            }
          >
            <p className="text-[0.83rem] text-[var(--color-ink-2)] mb-2 max-w-[46ch]">
              Confirm it is you: enter your password and a current code from your authenticator app.
            </p>
            <div className="flex flex-wrap gap-2 items-start">
              <input
                name="current" type="password" autoComplete="current-password"
                placeholder="Your password" aria-label="Your current password"
                className="input max-w-[220px]"
              />
              <input
                name="token" inputMode="numeric" maxLength={6} placeholder="000000"
                aria-label="Six-digit code" className="input max-w-[140px] font-mono text-center"
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>Turn it off</button>
              <button
                type="button" className="btn btn-ghost btn-sm" disabled={pending}
                onClick={() => { setRemoving(false); setError(null); }}
              >
                Cancel
              </button>
            </div>
            {error && <p role="alert" className="text-[0.8rem] text-[var(--color-danger)] mt-2">{error}</p>}
          </form>
        )}
      </div>
    );
  }

  if (!secret) {
    return (
      <div>
        <p className="text-[0.87rem] text-[var(--color-ink-2)] mb-3">
          Add a second step to signing in, using an authenticator app on your phone. Required for Administrator accounts.
        </p>
        <form
          action={(fd) =>
            start(async () => {
              const r = await beginTotpEnrolment(fd);
              if (r?.error) setError(r.error);
              else { setError(null); setSecret(r.secret ?? null); }
            })
          }
        >
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>Set it up</button>
          {error && <p role="alert" className="text-[0.8rem] text-[var(--color-danger)] mt-2">{error}</p>}
        </form>
      </div>
    );
  }

  const uri = `otpauth://totp/CGZSA:${encodeURIComponent(email)}?secret=${secret}&issuer=CGZSA`;

  return (
    <div>
      <p className="text-[0.87rem] text-[var(--color-ink-2)] mb-2">
        Add this key to your authenticator app, then type the six-digit code it shows.
      </p>
      <code className="block font-mono text-[0.85rem] bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-2 mb-1 break-all">
        {secret}
      </code>
      <p className="hint mb-3 break-all">{uri}</p>
      <form action={(fd) => start(async () => {
        const r = await confirmTotp(fd);
        if (r?.error) setError(r.error); else { setError(null); setDone(true); }
      })}>
        <div className="flex gap-2">
          <input name="token" inputMode="numeric" maxLength={6} placeholder="000000"
            aria-label="Six-digit code" className="input max-w-[140px] font-mono text-center" />
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>Confirm</button>
        </div>
        {error && <p role="alert" className="text-[0.8rem] text-[var(--color-danger)] mt-2">{error}</p>}
      </form>
    </div>
  );
}
