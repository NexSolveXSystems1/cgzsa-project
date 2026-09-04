import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { events, mediaAssets } from "@/db/schema";
import { redirectIfMoved } from "@/lib/redirects";
import { PageHead } from "@/components/public/PageHead";
import { formatDate, formatTime } from "@/lib/format";

export const revalidate = 120;

export async function generateStaticParams() {
  const rows = await db.select({ slug: events.slug }).from(events).where(eq(events.status, "PUBLISHED"));
  return rows.map((r) => ({ slug: r.slug }));
}

export default async function Event({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [e] = await db
    .select({
      title: events.title, summary: events.summary, startsAt: events.startsAt, endsAt: events.endsAt,
      location: events.location, county: events.county, registerUrl: events.registerUrl,
      imageKey: mediaAssets.storageKey, imageAlt: mediaAssets.altText,
    })
    .from(events).leftJoin(mediaAssets, eq(mediaAssets.id, events.imageId))
    .where(and(eq(events.slug, slug), eq(events.status, "PUBLISHED"), isNull(events.deletedAt))).limit(1);
  if (!e) {
    await redirectIfMoved(`/events/${slug}`);
    notFound();
  }

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Events", "/events"], [e.title]]} eyebrow={formatDate(e.startsAt)} title={e.title} />
      <section className="py-14"><div className="wrap grid gap-12 lg:grid-cols-[1fr_300px] items-start">
        <div className="prose-cg">
          {e.imageKey && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={`/api/media/${e.imageKey}`} alt={e.imageAlt ?? ""} className="w-full rounded-[10px] mb-7" />
          )}
          <p className="whitespace-pre-wrap">{e.summary}</p>
        </div>
        <aside className="card p-5 lg:sticky lg:top-28">
          <p className="eyebrow mb-3">Details</p>
          {([["Date", formatDate(e.startsAt)], ["Time", `${formatTime(e.startsAt)}${e.endsAt ? ` – ${formatTime(e.endsAt)}` : ""}`],
             ["Location", e.location], ["County", e.county ?? "—"]] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 border-b border-[var(--color-line)] last:border-0 text-[0.85rem]">
              <span className="text-[var(--color-ink-3)]">{k}</span><span className="text-right">{v}</span>
            </div>
          ))}
          {e.registerUrl ? (
            <a href={e.registerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm w-full mt-4">Register →</a>
          ) : (
            <Link href="/contact" className="btn btn-ghost btn-sm w-full mt-4">Ask about this event</Link>
          )}
        </aside>
      </div></section>
    </>
  );
}
