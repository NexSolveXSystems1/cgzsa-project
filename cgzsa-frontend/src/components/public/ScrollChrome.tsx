"use client";

import { useEffect, useState } from "react";

export function ScrollChrome() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let lastNavVisible: boolean | null = null;
    let lastTopVisible: boolean | null = null;

    const update = () => {
      frame = 0;

      const viewport = window.innerHeight || 1;
      const y = window.scrollY || window.pageYOffset;
      const navVisible = y >= viewport;

      if (lastNavVisible !== navVisible) {
        lastNavVisible = navVisible;
        root.dataset.publicNavVisible = navVisible ? "true" : "false";
      }

      const footer = document.querySelector<HTMLElement>(".site-footer");
      const footerVisible = footer
        ? footer.getBoundingClientRect().top <= viewport * 0.94
        : y + viewport >= document.documentElement.scrollHeight - 120;
      const topVisible = footerVisible && y > viewport * 0.5;

      if (lastTopVisible !== topVisible) {
        lastTopVisible = topVisible;
        setShowTop(topVisible);
      }
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      delete root.dataset.publicNavVisible;
    };
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      aria-hidden={!showTop}
      tabIndex={showTop ? 0 : -1}
      onClick={scrollToTop}
      className={"back-to-top" + (showTop ? " is-visible" : "")}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
