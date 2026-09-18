"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV } from "./nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setOpenGroup(null);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (open) setOpenGroup(null);
        }}
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
          <div className="border-b border-[var(--color-line)] py-2">
            <Link
              href="/search"
              onClick={close}
              className="block px-6 py-2.5 text-[0.92rem] no-underline text-[var(--color-ink-2)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]"
            >
              Search
            </Link>
          </div>
          {NAV.map((n) => {
            const hasChildren = n.items.length > 0;
            const expanded = openGroup === n.label;
            return (
            <div key={n.label} className="border-b border-[var(--color-line)]">
              <div className="flex items-stretch">
                <Link
                  href={n.href}
                  onClick={close}
                  className="flex min-h-12 flex-1 items-center px-6 py-3 text-[0.94rem] font-semibold no-underline text-[var(--color-ink)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]"
                >
                  {n.label}
                </Link>
                {hasChildren && (
                  <button
                    type="button"
                    aria-label={`${expanded ? "Close" : "Open"} ${n.label} menu`}
                    aria-expanded={expanded}
                    onClick={() => setOpenGroup(expanded ? null : n.label)}
                    className="grid min-h-12 w-14 place-items-center border-l border-[var(--color-line)] text-[var(--color-ink-2)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]"
                  >
                    <svg className={"transition-transform " + (expanded ? "rotate-180" : "")} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              {hasChildren && expanded && (
                <div className="bg-[var(--color-surface-2)] px-3 py-2">
                  {n.items.map(([href, title, sub]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={close}
                      className="block rounded-[5px] px-4 py-2.5 text-[0.9rem] leading-snug no-underline text-[var(--color-ink-2)] hover:bg-white hover:text-[var(--color-brand)]"
                    >
                      {title}
                      {sub && <small className="block text-[0.72rem] text-[var(--color-ink-3)] mt-px">{sub}</small>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}
    </>
  );
}
