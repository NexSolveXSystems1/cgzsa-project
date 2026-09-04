import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-6 py-24 text-center">
      <div>
        <p className="eyebrow mb-3">Error 404</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] mb-3.5">We cannot find that page</h1>
        <p className="text-[var(--color-ink-2)] max-w-[48ch] mx-auto mb-6">
          It may have been moved or renamed. Our content system creates a redirect whenever a page address changes, so
          this is unusual.
        </p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          <Link href="/" className="btn btn-primary">Back to home</Link>
          <Link href="/search" className="btn btn-ghost">Search the site</Link>
        </div>
      </div>
    </div>
  );
}
