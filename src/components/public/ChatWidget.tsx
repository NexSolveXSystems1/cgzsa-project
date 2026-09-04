"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Source = { title: string; url: string };
type Msg = {
  id: string;
  author: "VISITOR" | "ASSISTANT" | "STAFF" | "SYSTEM";
  body: string;
  sources?: Source[];
  staffName?: string | null;
  handover?: boolean;
};

const KEY = "cgzsa_chat";

export function ChatWidget({ assistantName, greeting }: { assistantName: string; greeting: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [askEmail, setAskEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The id of the last frame the visitor has seen. Sent as Last-Event-ID on
  // reconnection so the server can replay anything delivered while the
  // connection was down — on a mobile connection that gap is routine, and those
  // replies were previously lost for good.
  const lastEventId = useRef<string | null>(null);

  // Restore an in-progress conversation across page loads.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setConversationId(JSON.parse(saved).id ?? null);
    } catch {
      /* private mode, or storage blocked — chat still works, it just starts fresh */
    }
  }, []);

  useEffect(() => {
    if (msgs.length === 0 && open) {
      setMsgs([{ id: "greeting", author: "ASSISTANT", body: greeting }]);
    }
  }, [open, greeting, msgs.length]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, askEmail, done]);

  // The panel announced itself as a dialog but behaved like a div: focus stayed
  // on the page behind it, Tab walked out of it, and Escape did nothing. A
  // screen-reader user was told a dialog had opened and then left outside it.
  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Return focus to the launcher when the panel closes, so a keyboard user is
  // not dropped back at the top of the document.
  const closePanel = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  // Server-sent events: how a staff reply reaches the visitor (design review §14).
  useEffect(() => {
    if (!conversationId) return;
    const resume = lastEventId.current
      ? `&lastEventId=${encodeURIComponent(lastEventId.current)}`
      : "";
    const es = new EventSource(
      `/api/chat/stream?conversation=${encodeURIComponent(conversationId)}${resume}`,
    );
    es.addEventListener("message", (e) => {
      try {
        const ev = e as MessageEvent;
        const m = JSON.parse(ev.data) as Msg;
        // Remember where we got to. The browser sends this back automatically as
        // Last-Event-ID when it reconnects; the query string covers the first
        // connection after a full page load.
        if (ev.lastEventId) lastEventId.current = ev.lastEventId;
        // Once a person is in the conversation the email prompt is no longer needed.
        if (m.author === "STAFF") setAskEmail(false);
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      } catch {
        /* ignore malformed frame */
      }
    });
    es.onerror = () => {
      /* EventSource reconnects by itself; nothing to do */
    };
    return () => es.close();
  }, [conversationId]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || busy) return;
    setText("");
    setBusy(true);
    setMsgs((prev) => [...prev, { id: `local-${Date.now()}`, author: "VISITOR", body }]);
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, body, path: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        try {
          localStorage.setItem(KEY, JSON.stringify({ id: data.conversationId }));
        } catch { /* ignore */ }
      }
      if (data.reply) {
        const reply = data.reply as Msg;
        lastEventId.current = reply.id;
        setMsgs((prev) => (prev.some((x) => x.id === reply.id) ? prev : [...prev, reply]));
        if (data.reply.handover) setAskEmail(true);
      }
    } catch (err) {
      setMsgs((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          author: "SYSTEM",
          body: err instanceof Error ? err.message : "The message could not be sent. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [text, busy, conversationId]);

  async function submitEmail() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    const res = await fetch("/api/chat/escalate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, email }),
    });
    const data = await res.json();
    if (res.ok) {
      setAskEmail(false);
      setDone(data.reference as string);
    }
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Chat with ${assistantName}`}
          className="w-[min(374px,calc(100vw-32px))] max-h-[min(560px,calc(100vh-120px))] flex flex-col
                     rounded-2xl border border-[var(--color-line)] bg-white overflow-hidden shadow-2xl"
        >
          <div className="bg-[var(--color-brand)] text-white px-4 py-3.5 flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-white text-[var(--color-brand)] font-serif font-bold text-[0.8rem] shrink-0">
              CG
            </span>
            <span className="min-w-0 flex-1">
              <b className="block font-sans text-[0.92rem] font-semibold truncate">{assistantName}</b>
              <span className="flex items-center gap-1.5 text-[0.68rem] text-[#BFE6CE] leading-snug">
                <i className="w-1.5 h-1.5 rounded-full bg-[#7BE3A6] inline-block shrink-0" />
                Answers from our published pages
              </span>
            </span>
            <button onClick={closePanel} aria-label="Close chat" className="text-[#BFE6CE] hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-auto bg-[var(--color-surface-2)] p-4 flex flex-col gap-3">
            {msgs.map((m) =>
              m.author === "SYSTEM" ? (
                <div key={m.id} className="self-center text-center font-mono text-[0.72rem] text-[var(--color-ink-3)] tracking-[0.06em]">
                  {m.body}
                </div>
              ) : (
                <div
                  key={m.id}
                  className={
                    "max-w-[86%] rounded-xl px-3.5 py-2.5 text-[0.855rem] leading-relaxed " +
                    (m.author === "VISITOR"
                      ? "self-end bg-[var(--color-brand)] text-white rounded-br-sm"
                      : m.author === "STAFF"
                        ? "self-start bg-white border border-[var(--color-brand)] rounded-bl-sm text-[var(--color-ink-2)]"
                        : "self-start bg-white border border-[var(--color-line)] rounded-bl-sm text-[var(--color-ink-2)]")
                  }
                >
                  {m.author === "STAFF" && m.staffName && (
                    <span className="block font-mono text-[0.68rem] tracking-[0.09em] uppercase text-[var(--color-brand)] mb-1 font-medium">
                      {m.staffName} · CGZSA
                    </span>
                  )}
                  {m.body}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--color-line)] flex flex-wrap gap-1.5">
                      {m.sources.map((s) => (
                        <Link
                          key={s.url}
                          href={s.url}
                          className="text-[0.7rem] no-underline text-[var(--color-brand)] border border-[var(--color-line-2)]
                                     rounded-full px-2 py-0.5 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {busy && (
              <div className="self-start bg-white border border-[var(--color-line)] rounded-xl rounded-bl-sm px-3.5 py-2.5 text-[0.855rem] text-[var(--color-ink-3)]">
                Looking through our pages…
              </div>
            )}

            {askEmail && !done && (
              <div className="self-start w-full bg-white border border-[var(--color-brand)] rounded-xl p-3.5">
                <p className="text-[0.83rem] text-[var(--color-ink-2)] m-0 mb-2.5">
                  Leave your email and the team will reply, usually within one working day.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Your email address"
                    className="input flex-1 py-2 text-[0.85rem]"
                  />
                  <button onClick={submitEmail} className="btn btn-primary btn-sm">Send</button>
                </div>
              </div>
            )}

            {done && (
              <div className="self-start w-full bg-[var(--color-brand-soft)] border border-[var(--color-brand)] rounded-xl p-3.5">
                <p className="text-[0.85rem] text-[var(--color-ink-2)] m-0">
                  Thank you. Your reference is <b className="font-mono">{done}</b>. The team has your question and will
                  reply by email.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-line)] bg-white px-3.5 py-3">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void send(); } }}
                placeholder="Type your question…"
                aria-label="Your message"
                disabled={busy}
                className="flex-1 rounded-full border border-[var(--color-line-2)] px-3.5 py-2.5 text-[0.86rem]"
              />
              <button
                onClick={() => void send()}
                disabled={busy || !text.trim()}
                aria-label="Send"
                className="grid place-items-center w-9 h-9 rounded-full bg-[var(--color-brand)] text-white shrink-0 disabled:opacity-40"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="text-[0.65rem] text-[var(--color-ink-3)] text-center mt-2 leading-snug m-0">
              Answers come from CGZSA&rsquo;s own published pages and documents. We keep your messages to reply to you —
              see the <Link href="/privacy-policy" className="underline text-[var(--color-ink-3)]">privacy policy</Link>.
            </p>
          </div>
        </div>
      )}

      {!open && (
        <button
          ref={launcherRef}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="flex items-center gap-2.5 rounded-full bg-[var(--color-brand)] text-white px-5 py-3
                     font-semibold text-[0.9rem] shadow-xl hover:bg-[var(--color-brand-2)]"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-signal)] shrink-0" />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.8-.4L3 21l1.6-4.6A8.3 8.3 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
          </svg>
          Ask us a question
        </button>
      )}
    </div>
  );
}
