"use client";

import { useTransition, useState } from "react";
import { claimConversation, closeConversation, replyToConversation } from "@/lib/actions";

type Canned = { id: string; label: string; body: string };

export function ReplyBox({
  conversationId, mode, claimed, canClose, canned = [],
}: {
  conversationId: string;
  mode: "header" | "composer";
  claimed: boolean;
  canClose?: boolean;
  canned?: Canned[];
}) {
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");

  if (mode === "header") {
    return (
      <div className="flex gap-2">
        {!claimed && (
          <button
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() => start(() => void claimConversation(conversationId))}
          >
            Take this conversation
          </button>
        )}
        {canClose && (
          <button
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={() => start(() => void closeConversation(conversationId))}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Canned replies were seeded into the database from the beginning and
          read by no screen, so staff retyped the same answers every time. They
          fill the box rather than sending, so a person always edits and chooses
          to send — a stock answer fired off untouched is how chat support stops
          sounding like a person. */}
      {claimed && canned.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="font-mono text-[0.62rem] tracking-[0.12em] uppercase text-[var(--color-ink-3)] mr-0.5">
            Quick replies
          </span>
          {canned.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => setBody(c.body)}
              title={c.body}
              className="rounded-full border border-[var(--color-line-2)] bg-white px-2.5 py-1
                         text-[0.72rem] text-[var(--color-ink-2)] hover:border-[var(--color-brand)]
                         hover:text-[var(--color-brand)] disabled:opacity-40"
            >
              {c.label}
            </button>
          ))}
          {body && (
            <button
              type="button"
              onClick={() => setBody("")}
              className="text-[0.72rem] text-[var(--color-ink-3)] underline px-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <form
        action={(fd) => start(() => void replyToConversation(conversationId, fd).then(() => setBody("")))}
        className="flex gap-2 items-center"
      >
        <input
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={claimed ? "Write a reply…" : "Take the conversation first, then reply"}
          aria-label="Reply"
          className="input flex-1"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
