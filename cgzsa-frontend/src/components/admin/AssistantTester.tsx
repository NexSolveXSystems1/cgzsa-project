"use client";

import { useState } from "react";

type Answer = {
  body: string;
  sources: { title: string; url: string }[];
  confidence: number;
  handover: boolean;
  model: string;
  ms: number;
};

export function AssistantTester() {
  const [q, setQ] = useState("Do you install water taps in Paynesville?");
  const [a, setA] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      setA(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-3.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void run(); } }}
          aria-label="Test question"
          className="input flex-1"
        />
        <button type="button" onClick={() => void run()} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Asking…" : "Ask"}
        </button>
      </div>

      {a && (
        <div className={"rounded-xl border px-3.5 py-3 text-[0.87rem] leading-relaxed " +
          (a.handover ? "border-[var(--color-warn)] bg-[var(--color-warn-soft)]" : "border-[var(--color-line)] bg-white")}>
          {a.body}
          {a.sources?.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[var(--color-line)] flex flex-wrap gap-1.5">
              {a.sources.map((s) => (
                <span key={s.url} className="text-[0.7rem] text-[var(--color-brand)] border border-[var(--color-line-2)] rounded-full px-2 py-0.5">
                  {s.title}
                </span>
              ))}
            </div>
          )}
          <p className="font-mono text-[0.72rem] text-[var(--color-ink-3)] m-0 mt-2.5">
            confidence {a.confidence.toFixed(2)} · {a.handover ? "handed over" : "answered"} · {a.model} · {a.ms} ms
          </p>
        </div>
      )}
    </div>
  );
}
