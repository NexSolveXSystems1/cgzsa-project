"use client";

import { useState } from "react";
import Link from "next/link";

const INTERESTS = ["Clean-up drives", "Awareness teams", "Media and communications", "Fundraising", "Monitoring and evaluation"];
const COUNTIES = ["Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa", "Other"];

export function VolunteerForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const next: Record<string, string> = {};
    if (!data.firstName || data.firstName.trim().length < 2) next.firstName = "Enter your first name.";
    if (!data.lastName || data.lastName.trim().length < 2) next.lastName = "Enter your last name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email ?? "")) next.email = "Enter a valid email address.";
    if (!data.interest) next.interest = "Choose where you would like to help.";
    if (!data.consent) next.consent = "Please agree before sending.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await fetch("/api/volunteer", {
        method: "POST", headers: { "content-type": "application/json" },
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
        <h2 className="text-[1.15rem] mb-2">Application received</h2>
        <p className="text-[var(--color-ink-2)] text-[0.9rem] max-w-[42ch] mx-auto mb-3">
          Thank you for offering your time. We respond to every application, usually within a week.
        </p>
        <p className="font-mono text-[0.7rem] text-[var(--color-ink-3)] m-0">Reference {sent}</p>
      </div>
    );
  }

  const field = (id: string, label: string, required: boolean, input: React.ReactNode) => (
    <div className="field">
      <label htmlFor={id}>{label} {required && <span className="text-[var(--color-danger)]">*</span>}</label>
      {input}
      {errors[id] && <div className="err" role="alert">{errors[id]}</div>}
    </div>
  );

  return (
    <div className="card p-7">
      <h2 className="text-[1.2rem] mb-1.5">Volunteer application</h2>
      <p className="text-[0.85rem] text-[var(--color-ink-3)] mb-5">
        We respond to every application. Your details are stored securely and never shared.
      </p>
      <form onSubmit={onSubmit} noValidate>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <div className="grid gap-3.5 sm:grid-cols-2">
          {field("firstName", "First name", true, <input id="firstName" name="firstName" className="input" aria-invalid={!!errors.firstName} />)}
          {field("lastName", "Last name", true, <input id="lastName" name="lastName" className="input" aria-invalid={!!errors.lastName} />)}
        </div>
        {field("email", "Email", true, <input id="email" name="email" type="email" className="input" aria-invalid={!!errors.email} />)}
        <div className="grid gap-3.5 sm:grid-cols-2">
          {field("phone", "Phone", false, <input id="phone" name="phone" type="tel" className="input" placeholder="+231 …" />)}
          {field("county", "County", false, (
            <select id="county" name="county" className="input" defaultValue="">
              <option value="">Not set</option>
              {COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          ))}
        </div>
        {field("interest", "Where would you like to help?", true, (
          <select id="interest" name="interest" className="input" defaultValue="" aria-invalid={!!errors.interest}>
            <option value="">Choose one</option>
            {INTERESTS.map((i) => <option key={i}>{i}</option>)}
          </select>
        ))}
        {field("note", "Anything else we should know?", false, <textarea id="note" name="note" rows={3} className="input" />)}

        <label className="flex gap-2.5 items-start text-[0.8rem] text-[var(--color-ink-2)] mb-4">
          <input type="checkbox" name="consent" value="yes" className="mt-1" aria-invalid={!!errors.consent} />
          <span>I agree to CGZSA storing these details in order to respond to my application, as described in the{" "}
            <Link href="/privacy-policy" className="underline">privacy policy</Link>.</span>
        </label>
        {errors.consent && <p className="text-[0.78rem] text-[var(--color-danger)] mb-3">{errors.consent}</p>}
        {errors.form && <p className="text-[0.85rem] text-[var(--color-danger)] mb-3">{errors.form}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Sending…" : "Submit application"}
        </button>
        <p className="font-mono text-[0.68rem] text-[var(--color-ink-3)] text-center mt-3 m-0">
          Honeypot · rate limit · server-side validation
        </p>
      </form>
    </div>
  );
}
