"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV } from "./nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Menu"
        className="xl:hidden grid place-items-center w-11 h-11 rounded-[5px] border border-[var(--color-line)] text-[var(--color-ink-2)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d={open ? "M6 6l12 12M18 6 6 18" : "M3 6h18M3 12h18M3 18h18"} />
        </svg>
      </button>
      {open && (
        <div className="mobile-nav xl:hidden absolute left-0 right-0 top-full border-t border-[var(--color-line)] bg-white max-h-[70vh] overflow-auto shadow-lg">
          {NAV.map((n) => (
            <div key={n.label} className="border-b border-[var(--color-line)] py-2">
              <p className="px-6 pt-2 pb-1 font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
                {n.label}
              </p>
              {(n.items.length ? n.items : [[n.href, n.label, ""] as const]).map(([href, title]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block px-6 py-2.5 text-[0.92rem] no-underline text-[var(--color-ink-2)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]"
                >
                  {title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
