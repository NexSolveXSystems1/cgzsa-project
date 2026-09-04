import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { redirectIfMoved } from "@/lib/redirects";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { ProgramIcon } from "@/components/public/ProgramIcon";
import { pageMetadata, seoOverrides } from "@/lib/seo";

export const revalidate = 300;

export async function generateStaticParams() {
  const list = await db.select({ slug: programs.slug }).from(programs).where(eq(programs.status, "PUBLISHED"));
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await db.select().from(programs).where(eq(programs.slug, slug));
  if (!p) return {};
  return pageMetadata({
    path: `/programs/${p.slug}`,
    title: p.title,
    description: p.lead,
    override: await seoOverrides("program", p.id),
  });
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await db.select().from(programs).where(and(eq(programs.slug, slug), isNull(programs.deletedAt)));
  if (!p) {
    await redirectIfMoved(`/programs/${slug}`);
    notFound();
  }

  const others = await db.select().from(programs)
    .where(and(eq(programs.status, "PUBLISHED"), ne(programs.slug, slug), isNull(programs.deletedAt)))
    .orderBy(asc(programs.order));

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Programmes", "/programs"], [p.title]]} eyebrow={p.tagline} title={p.title} lede={p.lead} />
      <section className="py-14">
        <div className="wrap grid gap-13 lg:grid-cols-[1fr_320px] items-start">
          <div className="prose-cg">
            <div className="aspect-[21/9] rounded-[10px] grid place-items-center mb-8 text-white/90"
                 style={{ background: "linear-gradient(135deg,#005B32 0%,#00A54E 100%)" }}>
              <div className="text-center px-5">
                <div className="opacity-55 mb-2 flex justify-center"><ProgramIcon name={p.icon} size={40} /></div>
                <div className="font-mono text-[0.68rem] tracking-[0.16em] uppercase">Programme photograph · awaiting upload</div>
              </div>
            </div>

            <h2>What we do</h2>
            <ul>{p.activities.map((a) => <li key={a}>{a}</li>)}</ul>

            <h2>Why this programme exists</h2>
            {p.rationale.map((r) => <p key={r}>{r}</p>)}

            <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-brand)] bg-white px-5 py-4 mb-5">
              <p className="font-bold text-[0.87rem] m-0 mb-1.5">Our founding response</p>
              <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">{p.response}</p>
            </div>

            <h2>Projects under this programme</h2>
            <EmptyState
              title="No projects published yet"
              body="Individual installations, clean-ups and restorations appear here with their location, dates and status once they are entered in the content system."
            />
          </div>

          <aside className="grid gap-4 lg:sticky lg:top-28">
            <div className="card p-5">
              <p className="eyebrow mb-3">Get involved</p>
              <p className="text-[0.87rem] text-[var(--color-ink-2)] mb-3.5">
                This programme runs on volunteers and on partners who fund materials and installations.
              </p>
              <Link href="/get-involved/volunteer" className="btn btn-primary btn-sm w-full mb-2">Volunteer</Link>
              <Link href="/get-involved/partner" className="btn btn-ghost btn-sm w-full">Partner with us</Link>
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-3">Other programmes</p>
              {others.map((o) => (
                <Link key={o.id} href={`/programs/${o.slug}`} className="flex items-center gap-2.5 py-2 border-b border-[var(--color-line)] last:border-0 no-underline text-[var(--color-ink-2)] text-[0.855rem] hover:text-[var(--color-brand)]">
                  <span className="text-[var(--color-brand)] shrink-0"><ProgramIcon name={o.icon} size={17} /></span>
                  {o.title}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
