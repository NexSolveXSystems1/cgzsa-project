import Link from "next/link";
import type { StoryImage } from "./storyImages";

export function PageHead({
  crumbs, eyebrow, title, lede, image, children,
}: {
  crumbs: [string, string?][];
  eyebrow?: string;
  title: string;
  lede?: string;
  image?: StoryImage;
  children?: React.ReactNode;
}) {
  if (image) {
    return (
      <div className="relative overflow-hidden bg-[#07160d] text-white border-b border-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-62 page-head-photo" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,18,10,0.92)_0%,rgba(4,34,20,0.82)_48%,rgba(4,18,10,0.28)_100%)]" />
        <div className="wrap relative py-10 lg:py-12">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-white/70 mb-3.5">
            {crumbs.map(([label, href], i) => (
              <span key={label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="opacity-45">/</span>}
                {href ? (
                  <Link href={href} className="no-underline text-white/72 hover:text-white hover:underline">{label}</Link>
                ) : (
                  <span>{label}</span>
                )}
              </span>
            ))}
          </nav>
          {eyebrow && <p className="eyebrow mb-3 text-[#bff0d3]">{eyebrow}</p>}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl leading-[1.08] max-w-[18ch] text-white">{title}</h1>
          {lede && <p className="text-white/82 max-w-[58ch] mt-3.5 text-[1.02rem]">{lede}</p>}
          {children}
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl sm:text-4xl leading-[1.1] max-w-[20ch]">{title}</h1>
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
