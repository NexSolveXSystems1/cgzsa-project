"use client";

import { useState } from "react";
import Link from "next/link";

type Errors = Partial<Record<"name" | "email" | "subject" | "message" | "consent" | "form", string>>;

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    // Client-side checks are a courtesy. The server validates everything again.
    const next: Errors = {};
    if (!data.name || data.name.trim().length < 2) next.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email ?? "")) next.email = "Enter a valid email address, for example name@example.com.";
    if (!data.subject) next.subject = "Choose a subject.";
    if (!data.message || data.message.trim().length < 10) next.message = "Please write a little more so we can help.";
    if (!data.consent) next.consent = "Please agree before sending.";
    setErrors(next);
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, consent: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setSent(json.reference as string);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-8 text-center">
        <div className="grid place-items-center w-13 h-13 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] mx-auto mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
        </div>
        <h2 className="text-[1.15rem] mb-2">Message received</h2>
        <p className="text-[var(--color-ink-2)] text-[0.9rem] max-w-[40ch] mx-auto mb-4">
          Your message has been stored and a copy sent to the CGZSA inbox. We reply to every message.
        </p>
        <p className="font-mono text-[0.68rem] text-[var(--color-ink-3)] mb-4">
          Reference {sent} · stored first, emailed second
        </p>
        <button onClick={() => setSent(null)} className="btn btn-ghost btn-sm">Send another</button>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <h2 className="text-[1.25rem] mb-1.5">Send us a message</h2>
      <p className="text-[0.85rem] text-[var(--color-ink-3)] mb-5">Fields marked with an asterisk are required.</p>

      <form onSubmit={onSubmit} noValidate>
        {/* Honeypot */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="name" label="Full name" required error={errors.name}>
            <input id="name" name="name" type="text" className="input" aria-invalid={!!errors.name} />
          </Field>
          <Field id="email" label="Email" required error={errors.email}>
            <input id="email" name="email" type="email" className="input" aria-invalid={!!errors.email} />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="phone" label="Phone" hint="Optional">
            <input id="phone" name="phone" type="tel" className="input" />
          </Field>
          <Field id="subject" label="Subject" required error={errors.subject}>
            <select id="subject" name="subject" className="input" defaultValue="" aria-invalid={!!errors.subject}>
              <option value="">Choose a subject</option>
              <option>General enquiry</option>
              <option>Volunteering</option>
              <option>Partnership or sponsorship</option>
              <option>Media enquiry</option>
              <option>Report an environmental problem</option>
            </select>
          </Field>
        </div>

        <Field id="message" label="Message" required error={errors.message}>
          <textarea id="message" name="message" rows={6} className="input" aria-invalid={!!errors.message} />
        </Field>

        <label className="flex gap-2.5 items-start text-[0.8rem] text-[var(--color-ink-2)] mb-4">
          <input type="checkbox" name="consent" value="yes" className="mt-1" aria-invalid={!!errors.consent} />
          <span>
            I agree to CGZSA storing this message in order to reply, as described in the{" "}
            <Link href="/privacy-policy" className="underline">privacy policy</Link>.
          </span>
        </label>
        {errors.consent && <p className="err mb-3 text-[var(--color-danger)] text-[0.78rem]">{errors.consent}</p>}
        {errors.form && <p className="mb-3 text-[var(--color-danger)] text-[0.85rem]">{errors.form}</p>}

        <div className="flex flex-wrap items-center gap-3.5">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send message"}
          </button>
          <span className="font-mono text-[0.68rem] text-[var(--color-ink-3)]">
            Honeypot · rate limit · server-side validation
          </span>
        </div>
      </form>
    </div>
  );
}

function Field({
  id, label, required, hint, error, children,
}: {
  id: string; label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </label>
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div className="err" role="alert">{error}</div>}
    </div>
  );
}
