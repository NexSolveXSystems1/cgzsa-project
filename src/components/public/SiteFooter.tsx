import type { ReactNode } from "react";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

const SOCIAL_ICONS: Record<string, ReactNode> = {
  Facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  X: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  LinkedIn: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  YouTube: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  ),
};

function SocialLinks({ s }: { s: { facebookUrl: string | null; twitterUrl: string | null; instagramUrl: string | null; linkedinUrl: string | null; youtubeUrl: string | null } }) {
  const links = ([["Facebook", s.facebookUrl], ["X", s.twitterUrl], ["Instagram", s.instagramUrl],
    ["LinkedIn", s.linkedinUrl], ["YouTube", s.youtubeUrl]] as [string, string | null][]).filter(([, v]) => v);
  if (links.length === 0) {
    return <p className="text-[0.78rem] text-[#6C8175] mt-3.5">Social media addresses have not been supplied yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {links.map(([label, href]) => (
        <a key={label} href={href!} target="_blank" rel="noopener noreferrer"
           aria-label={label}
           title={label}
           className="social-link inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/10 text-[#B7C9BE] hover:text-white hover:border-white/30 hover:bg-white/10 transition-all duration-200">
          {SOCIAL_ICONS[label]}
        </a>
      ))}
    </div>
  );
}

export async function SiteFooter() {
  const s = await getSiteSettings();
  let logoStorageKey: string | null = null;
  if (s.logoId) {
    const [logo] = await db.select({ key: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.id, s.logoId)).limit(1);
    if (logo) logoStorageKey = logo.key;
  }
  const quick = [["/about", "About Us"], ["/programs", "Programmes"], ["/projects", "Projects"], ["/contact", "Contact"]];
  const res = [["/resources/faqs", "FAQs"], ["/resources/publications", "Publications"], ["/about/governance", "Governance"], ["/get-involved/volunteer", "Volunteer"]];
  const phones = [s.phone1, s.phone2, s.phone3].filter(Boolean) as string[];

  return (
    <>
      <div className="h-1" style={{ background: "linear-gradient(90deg,#005B32 0 33%,#FFF100 33% 66%,#00A54E 66% 100%)" }} />
      <footer className="site-footer bg-[#071009] text-[#B7C9BE] pt-13">
        <div className="wrap">
          <div className="grid gap-8 py-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr]">
            <div>
              <div className="flex items-center gap-3 mb-3.5">
                {logoStorageKey ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/api/media/${logoStorageKey}`} alt={s.orgName} className="h-11 w-auto max-w-[160px] object-contain" />
                ) : (
                  <span className="grid place-items-center w-11 h-11 rounded-full bg-white text-[var(--color-brand)] font-serif font-bold">CG</span>
                )}
                <b className="text-white font-serif text-[1.1rem]">{s.shortName}</b>
              </div>
              <p className="text-[0.88rem] max-w-[38ch] text-[#93A89B]">{s.defaultDescription}</p>
              <p className="mt-3.5 font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[#7C9086]">Motto: {s.motto}</p>
              <SocialLinks s={s} />
            </div>
            <div>
              <h2 className="text-white font-sans text-[0.76rem] tracking-[0.14em] uppercase font-semibold mb-3.5">Quick links</h2>
              <div className="flex flex-col">
                {quick.map(([h, t]) => (
                  <Link key={h} href={h} className="text-[0.875rem] no-underline text-[#B7C9BE] hover:text-white hover:underline">{t}</Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-white font-sans text-[0.76rem] tracking-[0.14em] uppercase font-semibold mb-3.5">Resources</h2>
              <div className="flex flex-col">
                {res.map(([h, t]) => (
                  <Link key={h} href={h} className="text-[0.875rem] no-underline text-[#B7C9BE] hover:text-white hover:underline">{t}</Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-white font-sans text-[0.76rem] tracking-[0.14em] uppercase font-semibold mb-3.5">Contact</h2>
              <p className="text-[0.86rem] text-[#93A89B] mb-3">{s.office}</p>
              <div className="flex flex-col">
                <a href={`mailto:${s.email}`} className="text-[0.875rem] no-underline break-all text-[#B7C9BE] hover:text-white hover:underline">{s.email}</a>
                {phones.map((p) => (
                  <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="font-mono text-[0.85rem] no-underline text-[#B7C9BE] hover:text-white">{p}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 py-5 flex flex-wrap gap-4 justify-between text-[0.78rem] text-[#7C9086]">
            <div>
              © {new Date().getFullYear()} {s.orgName}. Registered NGO, Republic of Liberia.
              {s.showRegistrationNo && s.registrationNo ? ` Reg. no. ${s.registrationNo}.` : ""}
            </div>
            <div className="flex gap-4 flex-wrap">
              <Link href="/privacy-policy" className="no-underline hover:text-white hover:underline">Privacy Policy</Link>
              <Link href="/cookie-policy" className="no-underline hover:text-white hover:underline">Cookie Policy</Link>
              <Link href="/accessibility" className="no-underline hover:text-white hover:underline">Accessibility</Link>
              <Link href="/admin" className="no-underline hover:text-white hover:underline">Staff sign in</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
