"use client";

import { useActionState } from "react";

type Result = { ok?: boolean; error?: string } | undefined;

/**
 * A form that reports what happened. Every module's save action returns either
 * { ok } or { error }, so the feedback is the same everywhere.
 */
export function SaveForm({
  action, children, label = "Save",
}: {
  action: (formData: FormData) => Promise<Result | void>;
  children: React.ReactNode;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState<Result, FormData>(
    async (_prev, formData) => (await action(formData)) ?? undefined,
    undefined,
  );

  return (
    <form action={formAction}>
      {children}
      <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-3.5 bg-white/95 backdrop-blur border-t border-[var(--color-line)] flex items-center gap-3.5">
        <button type="submit" data-testid="save" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Saving…" : label}
        </button>
        {state?.error ? (
          <span role="alert" className="text-[0.82rem] text-[var(--color-danger)]">{state.error}</span>
        ) : null}
        {state?.ok ? (
          <span role="status" className="text-[0.82rem] text-[var(--color-brand)]">Saved.</span>
        ) : null}
      </div>
    </form>
  );
}
