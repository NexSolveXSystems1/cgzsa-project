"use client";

import { useTransition } from "react";
import { restoreRevision } from "@/app/admin/pages/actions";
import { restoreArticleRevision } from "@/app/admin/news/actions";

export function RevisionList({
  pageId, revisions, kind = "page",
}: {
  pageId: string;
  revisions: { id: string; version: number; createdAt: string; author: string | null }[];
  /** Which editor this history belongs to. Decides which restore runs. */
  kind?: "page" | "article";
}) {
  const restore = kind === "article" ? restoreArticleRevision : restoreRevision;
  const [pending, start] = useTransition();
  return (
    <div>
      <p className="text-[0.75rem] text-[var(--color-ink-3)] mt-0 mb-2.5 leading-relaxed">
        Each save stores the text as it was before that save. Restoring copies the chosen
        version forward as a new one, so nothing already written is lost.
      </p>
      {revisions.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-b border-[var(--color-line)] last:border-0 text-[0.8rem]">
          <span className="font-mono text-[var(--color-brand)]">v{r.version}</span>
          <span className="text-[var(--color-ink-2)]">
            {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="ml-auto text-[var(--color-ink-3)] text-[0.74rem]">{r.author ?? "\u2014"}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={pending}
            onClick={() => start(() => void restore(pageId, r.id))}
          >
            Restore
          </button>
        </div>
      ))}
</div>
  );
}
