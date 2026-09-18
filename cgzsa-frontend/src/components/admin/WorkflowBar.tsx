"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { transitionResource, deleteResource } from "@/lib/content-actions";
import type { ResourceKey } from "@/lib/resources";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/workflow";

/**
 * The workflow controls. Which buttons appear is decided on the server and
 * passed in — the client never decides what a user may do, it only renders it.
 */
export function WorkflowBar({
  resource, id, status, transitions, canDelete, returnTo,
}: {
  resource: ResourceKey;
  id: string;
  status: Status;
  transitions: { to: Status; label: string }[];
  canDelete: boolean;
  returnTo: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(fn: () => Promise<void>, then?: () => void) {
    setError(null);
    start(async () => {
      try {
        await fn();
        then?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not work.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap font-mono text-[0.74rem] text-[var(--color-ink-3)] mb-3.5">
        {STATUSES.filter((s) => s !== "ARCHIVED" || status === "ARCHIVED").map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={
              "px-2 py-0.5 rounded-full border " +
              (s === status
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)] font-semibold"
                : "border-[var(--color-line-2)]")
            }>
              {STATUS_LABEL[s]}
            </span>
            {i < arr.length - 1 && <span className="opacity-40">→</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-2">
        {transitions.map((t) => (
          <button
            key={t.to}
            className={"btn btn-sm w-full " + (t.to === "PUBLISHED" ? "btn-primary" : "btn-ghost")}
            disabled={pending}
            onClick={() => run(() => transitionResource(resource, id, t.to))}
          >
            {t.label}
          </button>
        ))}
        {transitions.length === 0 && (
          <p className="text-[0.78rem] text-[var(--color-ink-3)] m-0">
            No further action is available to you at this stage.
          </p>
        )}
        {canDelete && (
          <button
            className="btn btn-sm w-full border-[var(--color-danger)]/35 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
            disabled={pending}
            onClick={() => run(() => deleteResource(resource, id), () => router.push(returnTo))}
          >
            Delete
          </button>
        )}
      </div>

      {error && <p className="text-[0.78rem] text-[var(--color-danger)] mt-3" role="alert">{error}</p>}
      <p className="text-[0.75rem] text-[var(--color-ink-3)] mt-3 leading-relaxed">
        Publishing is a separate permission from editing. Every transition is recorded in the audit log.
      </p>
    </div>
  );
}
