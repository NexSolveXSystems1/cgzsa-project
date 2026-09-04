import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { GET_INVOLVED } from "@/db/content";
import { getSiteSettings } from "@/lib/settings";
import { VolunteerForm } from "@/components/public/VolunteerForm";
import { pageMetadata, seoOverrides } from "@/lib/seo";

export const revalidate = 300;

const OK = ["volunteer", "partner", "donate"] as const;
export function generateStaticParams() { return OK.map((slug) => ({ slug })); }

/**
 * These three pages are CMS rows rendered by a dedicated route rather than the
 * catch-all, so they need their own metadata function — without one they
 * inherited the site-wide title and description, and an editor's seo_meta
 * override never reached them.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(OK as readonly string[]).includes(slug)) return {};
  const [page] = await db.select().from(pages).where(eq(pages.slug, `get-involved/${slug}`));
  if (!page) return {};
  return pageMetadata({
    path: `/get-involved/${slug}`,
    title: page.title,
    description: page.excerpt ?? undefined,
    override: await seoOverrides("page", page.id),
  });
}

export default async function GetInvolved({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(OK as readonly string[]).includes(slug)) notFound();

  const [page] = await db.select().from(pages).where(eq(pages.slug, `get-involved/${slug}`));
  const s = await getSiteSettings();
  const phones = [s.phone1, s.phone2, s.phone3].filter(Boolean) as string[];
  const cards = slug === "volunteer" ? GET_INVOLVED.volunteer : slug === "partner" ? GET_INVOLVED.partner : [];

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Get Involved"], [page?.title ?? slug]]}
        eyebrow="Get involved"
        title={page?.title ?? slug}
        lede={page?.excerpt ?? undefined}
      />
      <section className="py-14"><div className="wrap">
        {cards.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 mb-10">
            {cards.map(([title, body]) => (
              <div key={title} className="card p-6">
                <h2 className="text-[1.05rem] mb-2">{title}</h2>
                <p className="m-0 text-[0.885rem] text-[var(--color-ink-2)]">{body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-11 lg:grid-cols-2 items-start">
          <div className="prose-cg">
            <p>{page?.body}</p>
            <Link href="/contact" className="btn btn-primary">Start a conversation →</Link>
          </div>

          {slug === "donate" ? (
            <div className="card p-7">
              <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-warn)] bg-[var(--color-warn-soft)] px-5 py-4 mb-5">
                <p className="font-bold text-[0.87rem] m-0 mb-1.5">Payment details not yet published</p>
                <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">
                  CGZSA has not yet supplied bank or mobile-money details for this page. Until it does, supporters are
                  asked to make contact directly and arrangements are made individually.
                </p>
              </div>
              <h2 className="text-[1.05rem] mb-3">Arrange your support</h2>
              {phones.map((p) => (
                <div key={p} className="flex items-center gap-2.5 py-2 border-b border-[var(--color-line)] text-[0.9rem]">
                  <span className="font-mono">{p}</span>
                </div>
              ))}
            </div>
          ) : slug === "partner" ? (
            <div>
              <h2 className="text-[1.2rem] mb-4">Our partners</h2>
              <EmptyState title="No partners listed yet" body="Partner and donor logos appear here once agreements are in place and permission to use each mark has been confirmed." />
            </div>
          ) : (
            <VolunteerForm />
          )}
        </div>
      </div></section>
    </>
  );
}
