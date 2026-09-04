import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";
import { pageMetadata, seoOverrides } from "@/lib/seo";

export const revalidate = 300;

const SECTION = [
  ["/about/why-we-were-founded", "Why we were founded"],
  ["/about/mission-vision-values", "Mission, vision & values"],
  ["/about/goals-and-objectives", "Goals & objectives"],
  ["/about/leadership", "Leadership & team"],
  ["/about/governance", "Governance & registration"],
];

/**
 * The about page renders the CMS row with slug "about". It had no metadata of
 * its own, so it inherited the site-wide title and description.
 */
export async function generateMetadata() {
  const [page] = await db.select().from(pages).where(eq(pages.slug, "about"));
  if (!page) return {};
  return pageMetadata({
    path: "/about",
    title: page.title,
    description: page.excerpt ?? undefined,
    override: await seoOverrides("page", page.id),
  });
}

export default async function About() {
  const [page] = await db.select().from(pages).where(eq(pages.slug, "about"));
  const paras = (page?.body ?? "").split(/\n{2,}/);

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["About"]]} eyebrow="About CGZSA" title={page?.title ?? "Who We Are"} lede={page?.excerpt ?? undefined} />
      <section className="py-14">
        <div className="wrap grid gap-13 lg:grid-cols-[1fr_300px] items-start">
          <div className="prose-cg">
            {paras.map((p, i) => (
              <p key={i} className={i === 0 ? "text-[1.1rem] text-[var(--color-ink)]" : undefined}>{p}</p>
            ))}
          </div>
          <aside className="card p-5 lg:sticky lg:top-28">
            <p className="eyebrow mb-3">In this section</p>
            {SECTION.map(([href, label]) => (
              <Link key={href} href={href} className="block py-2 border-b border-[var(--color-line)] last:border-0 text-[0.875rem] no-underline text-[var(--color-ink-2)] hover:text-[var(--color-brand)]">
                {label}
              </Link>
            ))}
          </aside>
        </div>
      </section>
    </>
  );
}
