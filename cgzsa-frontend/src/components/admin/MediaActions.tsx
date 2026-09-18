"use client";

import { useState, useTransition } from "react";
import { purgeAsset, restoreAsset, softDeleteAsset } from "@/app/admin/media/actions";

/**
 * Remove and restore controls for one media file.
 *
 * The library had no delete control at all, so a file uploaded by mistake — or
 * one a subject later asked to have removed — could only be dealt with in the
 * database. Two stages, matching the actions behind them: remove is reversible
 * and hides the file; purge deletes the row and the file for good and asks for
 * confirmation inline rather than through a browser dialog, which would freeze
 * the automation this system is tested with.
 */
export function MediaActions({
  assetId,
  deleted,
  mayPurge,
}: {
  assetId: string;
  deleted: boolean;
  mayPurge: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string; ok?: boolean }>) =>
    start(async () => {
      const r = await fn();
      setError(r?.error ?? null);
      if (!r?.error) setConfirming(false);
    });

  return (
    <div className="px-3 pb-2.5">
      {!deleted ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => softDeleteAsset(assetId))}
          className="btn btn-ghost btn-sm w-full"
        >
          Remove
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="chip chip-mute self-start">Removed</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => restoreAsset(assetId))}
            className="btn btn-ghost btn-sm w-full"
          >
            Put it back
          </button>

          {mayPurge &&
            (!confirming ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(true)}
                className="btn btn-ghost btn-sm w-full text-[var(--color-danger)]"
              >
                Delete permanently
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => purgeAsset(assetId))}
                  className="btn btn-sm flex-1 bg-[var(--color-danger)] text-white border-[var(--color-danger)]"
                >
                  Yes, delete the file
                </button>
                <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[0.72rem] text-[var(--color-danger)] mt-1.5 leading-snug m-0">
          {error}
        </p>
      )}
    </div>
  );
}
