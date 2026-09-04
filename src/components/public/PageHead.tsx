import Link from "next/link";

export function PageHead({
  crumbs, eyebrow, title, lede, children,
}: {
  crumbs: [string, string?][];
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] border-b border-[var(--color-line)] py-9">
      <div className="wrap">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-[var(--color-ink-3)] mb-3.5">
          {crumbs.map(([label, href], i) => (
            <span key={label} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="opacity-50">/</span>}
              {href ? (
                <Link href={href} className="no-underline text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:underline">{label}</Link>
              ) : (
                <span>{label}</span>
              )}
            </span>
          ))}
        </nav>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[clamp(1.8rem,4vw,2.7rem)] leading-[1.1] max-w-[20ch]">{title}</h1>
        {lede && <p className="text-[var(--color-ink-2)] max-w-[62ch] mt-3.5 text-[1.05rem]">{lede}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-line-2)] bg-white px-7 py-12 text-center">
      <h2 className="text-lg mb-2">{title}</h2>
      <p className="text-[var(--color-ink-3)] text-[0.9rem] max-w-[46ch] mx-auto m-0">{body}</p>
    </div>
  );
}
