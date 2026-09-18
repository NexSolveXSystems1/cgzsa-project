"use client";

import { useState, useTransition } from "react";
import { answerGap, ignoreGap, reindex } from "@/app/admin/chat/knowledge/actions";

export function ReindexButton() {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(() => void reindex())}>
      {pending ? "Reindexing…" : "Reindex everything"}
    </button>
  );
}

export function GapRow({ id, question, timesAsked }: { id: string; question: string; timesAsked: number }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="py-3 border-b border-[var(--color-line)] last:border-0">
      <div className="flex items-center gap-3">
        <b className="font-semibold text-[0.88rem] flex-1">{question}</b>
        <span className="font-mono text-[0.78rem] text-[var(--color-ink-3)] whitespace-nowrap">asked {timesAsked}×</span>
        <button className="btn btn-primary btn-xs" onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "Write an answer"}
        </button>
        <button className="btn btn-ghost btn-xs" disabled={pending} onClick={() => start(() => void ignoreGap(id))}>
          Ignore
        </button>
      </div>

      {open && (
        <form
          className="mt-3"
          action={(fd) => {
            setError(null);
            fd.set("question", question);
            start(async () => {
              const r = await answerGap(id, fd);
              if (r && "error" in r && r.error) setError(r.error);
              else setOpen(false);
            });
          }}
        >
          <textarea
            name="answer"
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write the answer as you would say it to a visitor. It becomes an FAQ, and the assistant can quote it from then on."
            className="input mb-2"
          />
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? "Saving…" : "Save as an FAQ"}
            </button>
            {error && <span role="alert" className="text-[0.8rem] text-[var(--color-danger)]">{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
