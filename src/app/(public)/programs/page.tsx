import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";
import { ProgramIcon } from "@/components/public/ProgramIcon";

export const revalidate = 300;
export const metadata = { title: "Programmes" };

export default async function Programs() {
  const list = await db.select().from(programs)
    .where(and(eq(programs.status, "PUBLISHED"), isNull(programs.deletedAt)))
    .orderBy(asc(programs.order));

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Programmes"]]}
        eyebrow="Our work"
        title="Programmes"
        lede="Five permanent programme areas. Each one answers a problem named in our founding analysis."
      />
      <section className="py-14">
        <div className="wrap grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <Link key={p.id} href={`/programs/${p.slug}`} className="card p-7 no-underline text-inherit flex flex-col gap-2.5 transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-[10px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] shrink-0">
                  <ProgramIcon name={p.icon} />
                </span>
                <span className="chip chip-mute chip-none">{p.tagline}</span>
              </div>
              <h2 className="text-[1.2rem]">{p.title}</h2>
              <p className="m-0 text-[var(--color-ink-2)] text-[0.895rem]">{p.lead}</p>
              <ul className="m-0 mt-1 pl-5 list-disc text-[0.85rem] text-[var(--color-ink-2)]">
                {p.activities.map((a) => <li key={a} className="mb-1">{a}</li>)}
              </ul>
              <span className="mt-auto pt-3 text-[0.82rem] font-semibold text-[var(--color-brand)]">Programme detail →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
