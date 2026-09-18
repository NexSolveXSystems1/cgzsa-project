import { PageHead } from "@/components/public/PageHead";
import { CmsPage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";

export async function generateMetadata() {
  return cmsMetadata("cookie-policy", {
    path: "/cookie-policy",
    title: "Cookie Policy",
    description: "The small number of cookies this website sets, and what each one does.",
    image: STORY_IMAGES.publicSpace,
  });
}

const COOKIES: [string, string, string, string][] = [
  ["cgzsa_session", "Keeps staff signed in to the content management system", "12 hours", "Essential"],
  ["cgzsa_visitor", "An anonymous identifier so a live chat conversation continues across pages", "12 months", "Essential"],
  ["cgzsa_consent", "Remembers your cookie choice so we do not ask again", "12 months", "Essential"],
];

export default async function CookiePolicy() {
  const page = await getPublishedCmsPage("cookie-policy");
  if (page) return <CmsPage page={page} crumbs={[["Home", "/"], ["Cookie Policy"]]} eyebrow="Legal" fallbackImage={STORY_IMAGES.publicSpace} narrow />;

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Cookie Policy"]]} eyebrow="Legal" title="Cookie Policy"
        lede="The small number of cookies this website sets, and what each one does." />
      <section className="py-14"><div className="wrap-narrow">
        <div className="card overflow-x-auto mb-6">
          <table className="w-full text-[0.88rem] min-w-[520px]">
            <thead><tr className="bg-[var(--color-surface-2)] text-left">
              {["Cookie", "Purpose", "Duration", "Type"].map((h) => (
                <th key={h} className="px-4 py-3 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {COOKIES.map(([n, p, d, t]) => (
                <tr key={n} className="border-t border-[var(--color-line)]">
                  <td className="px-4 py-3 font-mono text-[0.82rem]">{n}</td>
                  <td className="px-4 py-3">{p}</td>
                  <td className="px-4 py-3">{d}</td>
                  <td className="px-4 py-3">{t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="prose-cg max-w-none">
          <h2>No advertising</h2>
          <p>We use no advertising cookies, no tracking pixels and no third-party marketing tags. Every cookie above is
            required for the site to work.</p>
          <h2>Your choice</h2>
          <p>Essential cookies cannot be switched off without breaking sign-in or live chat. You can clear them at any
            time in your browser&rsquo;s settings for this site.</p>
        </div>
      </div></section>
    </>
  );
}
