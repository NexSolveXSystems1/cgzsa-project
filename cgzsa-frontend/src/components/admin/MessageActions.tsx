"use client";

import { useTransition } from "react";
import { erasePersonalRecord, setApplicationStatus, setMessageStatus } from "@/app/admin/messages/actions";

export function MessageActions({
  id, kind, status,
}: { id: string; kind: "message" | "application"; status: string }) {
  const [pending, start] = useTransition();
  const set = kind === "message" ? setMessageStatus : setApplicationStatus;

  return (
    <div className="flex gap-1.5 justify-end">
      {status !== "REPLIED" && (
        <button className="btn btn-ghost btn-xs" disabled={pending}
          onClick={() => start(() => void set(id, "REPLIED"))}>Mark replied</button>
      )}
      {status !== "ARCHIVED" && (
        <button className="btn btn-ghost btn-xs" disabled={pending}
          onClick={() => start(() => void set(id, "ARCHIVED"))}>Archive</button>
      )}
      <button
        className="btn btn-xs border-[var(--color-danger)]/35 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
        disabled={pending}
        title="Erase permanently, for a data subject request"
        onClick={() => { if (confirm("Erase this record permanently? This cannot be undone.")) start(() => void erasePersonalRecord(kind, id)); }}
      >
        Erase
      </button>
    </div>
  );
}
