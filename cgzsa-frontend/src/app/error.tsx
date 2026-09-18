"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * The page a visitor sees when something on the server fails.
 *
 * The application defined no error boundary at all, so a database hiccup gave
 * visitors the framework's unstyled "Internal Server Error" — no branding, no
 * navigation, no way to try again. On a slow connection that is indistinguishable
 * from the organisation having disappeared.
 *
 * Nothing from the error object is rendered. Next.js already redacts server
 * errors in production, and there is nothing in a stack trace a visitor can use.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[render]", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-[46rem] px-5 py-20 text-center">
      <p className="font-mono text-[0.72rem] tracking-[0.16em] uppercase text-[var(--color-ink-3)] mb-3">
        Something went wrong
      </p>
      <h1 className="text-[clamp(1.6rem,4vw,2.2rem)] mb-4">This page could not be loaded</h1>
      <p className="text-[0.95rem] text-[var(--color-ink-2)] max-w-[46ch] mx-auto mb-7">
        The problem is at our end, not yours. It is usually temporary — trying again often works.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-ghost">Go to the home page</Link>
        <Link href="/contact" className="btn btn-ghost">Contact us</Link>
      </div>

      {error.digest && (
        <p className="hint mt-8">
          If you report this, quote reference <code className="font-mono">{error.digest}</code>.
        </p>
      )}
    </main>
  );
}
