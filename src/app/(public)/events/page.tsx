import Link from "next/link";
import { and, asc, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { formatTime } from "@/lib/format";

export const revalidate = 120;
export const metadata = { title: "Events" };

export default async function Events({ searchParams }: { searchParams: Promise<{ when?: string }> }) {
  const { when } = await searchParams;
  const past = when === "past";
  const now = new Date();

  const rows = await db.select().from(events)
    .where(and(eq(events.status, "PUBLISHED"), isNull(events.deletedAt), past ? lt(events.startsAt, now) : gte(events.startsAt, now)))
    .orderBy(past ? desc(events.startsAt) : asc(events.startsAt));

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Events"]]} eyebrow="Diary" title="Events"
        lede="Come and work with us. Most of our events are open to anyone who turns up." />
      <section className="py-14"><div className="wrap">
        <div className="flex gap-2 mb-7">
          {[["Upcoming", "/events", !past], ["Past", "/events?when=past", past]].map(([label, href, active]) => (
            <Link key={href as string} href={href as string}
              className={"filter-tab rounded-full border px-3.5 py-1.5 text-[0.83rem] no-underline " +
                (active ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-semibold" : "bg-white border-[var(--color-line)] text-[var(--color-ink-2)]")}>
              {label as string}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState title={past ? "No past events recorded" : "No upcoming events"}
            body="Clean-up days, workshops and training sessions appear here with date, time, location and a registration link." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}`} className="card p-5 flex gap-5 no-underline text-inherit transition hover:border-[var(--color-brand)] hover:shadow-lg">
                <div className="shrink-0 text-center bg-[var(--color-brand-soft)] rounded-lg px-3 py-2.5 min-w-[64px] h-fit">
                  <div className="font-serif text-2xl font-bold leading-none text-[var(--color-brand)]">{new Date(e.startsAt).getDate()}</div>
                  <div className="font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-brand)]">
                    {new Date(e.startsAt).toLocaleDateString("en-GB", { month: "short" })}
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base mb-1.5">{e.title}</h2>
                  <p className="m-0 mb-2 text-[0.84rem] text-[var(--color-ink-2)] line-clamp-3">{e.summary}</p>
                  <div className="flex gap-3 flex-wrap font-mono text-[0.76rem] text-[var(--color-ink-3)]">
                    <span>{formatTime(e.startsAt)}</span><span>{e.location}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
