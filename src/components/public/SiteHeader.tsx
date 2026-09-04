import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { MobileNav } from "./MobileNav";
import { NAV } from "./nav";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function SiteHeader() {
  const s = await getSiteSettings();
  let logoStorageKey: string | null = null;
  if (s.logoId) {
    const [logo] = await db.select({ key: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.id, s.logoId)).limit(1);
    if (logo) logoStorageKey = logo.key;
  }

  return (
    <>
      <div className="utility-bar bg-[var(--color-brand)] text-white text-[0.78rem]">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 min-h-[34px]">
          <span className="opacity-90 hidden sm:block">{s.strapline}</span>
          <div className="flex gap-4 ml-auto">
            <a href={`tel:${s.phone1.replace(/\s/g, "")}`} className="opacity-90 hover:opacity-100 hover:underline">
              {s.phone1}
            </a>
            <Link href="/admin" className="opacity-90 hover:opacity-100 hover:underline">
              Staff sign in
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-line)] shadow-sm">
        <div className="wrap">
          <div className="flex items-center gap-6 min-h-[74px]">
            <Link href="/" className="flex items-center gap-3 shrink-0 no-underline text-[var(--color-ink)]">
              {logoStorageKey ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={`/api/media/${logoStorageKey}`} alt={s.orgName} className="h-[46px] w-auto max-w-[180px] object-contain shrink-0" />
              ) : (
                <span className="grid place-items-center w-[46px] h-[46px] rounded-full bg-[var(--color-brand)] text-white font-serif font-bold text-[0.95rem] shrink-0">
                  CG
                </span>
              )}
              <span className="leading-tight">
                <b className="block font-serif text-[1.22rem] font-bold tracking-[-0.02em]">{s.shortName}</b>
                <span className="hidden sm:block text-[0.635rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">
                  {s.orgName}
                </span>
              </span>
            </Link>

            <nav className="ml-auto hidden xl:flex items-center gap-0.5" aria-label="Main">
              {NAV.map((n) => (
                <div key={n.label} className="relative group">
                  <Link
                    href={n.href}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[5px] text-[0.885rem] font-medium
                               text-[var(--color-ink-2)] no-underline whitespace-nowrap
                               hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-2)]"
                  >
                    {n.label}
                    {n.items.length > 0 && (
                      <span aria-hidden className="opacity-60 text-[0.7rem]">▾</span>
                    )}
                  </Link>
                  {n.items.length > 0 && (
                    <div
                      className="absolute left-0 top-full pt-1.5 hidden group-hover:block group-focus-within:block z-50"
                    >
                      <div className="min-w-[262px] rounded-lg border border-[var(--color-line)] bg-white p-2 shadow-xl">
                        {n.items.map(([href, title, sub]) => (
                          <Link
                            key={href}
                            href={href}
                            className="block rounded-[5px] px-3 py-2 text-[0.855rem] leading-snug no-underline
                                       text-[var(--color-ink-2)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]"
                          >
                            {title}
                            {sub && <small className="block text-[0.72rem] text-[var(--color-ink-3)] mt-px">{sub}</small>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-2 ml-auto xl:ml-0 shrink min-w-0">
              <Link href="/search" aria-label="Search the site" className="grid place-items-center w-11 h-11 rounded-[5px] border border-[var(--color-line)] text-[var(--color-ink-2)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
              </Link>
              <Link href="/get-involved/volunteer" className="btn btn-primary btn-sm hidden sm:inline-flex whitespace-nowrap shrink-0">
                Get involved
              </Link>
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
