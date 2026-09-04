import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { impactMetrics, programs } from "@/db/schema";
import { getSiteSettings } from "@/lib/settings";
import { FOUNDING, ORG, VALUES } from "@/db/content";
import { ProgramIcon } from "@/components/public/ProgramIcon";
import { Counter } from "@/components/public/Counter";

export const revalidate = 300;

export default async function Home() {
  const s = await getSiteSettings();
  const [progs, metrics] = await Promise.all([
    db.select().from(programs).where(and(eq(programs.status, "PUBLISHED"), isNull(programs.deletedAt))).orderBy(asc(programs.order)),
    db.select().from(impactMetrics).orderBy(asc(impactMetrics.order)),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(158deg,#004526 0%,#005B32 46%,#007A42 100%)" }}>
        <div className="wrap relative py-20 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#BFF0D3]/35 px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.17em] uppercase text-[#BFF0D3] mb-6">
            Youth-led · Registered NGO · Republic of Liberia
          </span>
          <div className="h-[5px] w-[104px] bg-[var(--color-signal)] rounded-sm mb-6" />
          <h1 className="text-[clamp(2.1rem,5.2vw,3.7rem)] leading-[1.05] max-w-[17ch] text-white mb-5">
            Turning grassroots action into nationwide transformation.
          </h1>
          <p className="text-[clamp(1rem,1.7vw,1.16rem)] max-w-[56ch] text-[#D6EEE0] mb-8">
            {s.shortName} mobilizes youth and communities across Liberia to tackle waste pollution, restore
            neglected public spaces, and provide access to safe drinking water.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/programs" className="btn btn-light">Explore our programmes →</Link>
            <Link href="/get-involved/volunteer" className="btn btn-onbrand">Volunteer with us</Link>
          </div>
        </div>
      </section>

      {/* The Zero Sphere */}
      <section className="bg-[var(--color-surface)] border-b border-[var(--color-line)] py-11">
        <div className="wrap grid gap-7 items-center" style={{ gridTemplateColumns: "auto 1fr" }}>
          <div className="font-serif text-[clamp(2.4rem,6vw,4rem)] font-bold text-[var(--color-brand)] leading-none tracking-[-0.04em] whitespace-nowrap">
            Zero<span className="text-[var(--color-ink-3)]">&nbsp;×&nbsp;3</span>
          </div>
          <p className="m-0 text-[var(--color-ink-2)] max-w-[62ch] text-[1.02rem]">
            The <b className="text-[var(--color-ink)]">Zero Sphere</b> in our name reflects our vision:{" "}
            <b className="text-[var(--color-ink)]">zero pollution, zero unsafe water, zero wasted potential.</b> Three
            targets that between them cover the environment, public health and the future of Liberia&rsquo;s young people.
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16">
        <div className="wrap grid gap-13 lg:grid-cols-[1.25fr_1fr] items-start">
          <div>
            <p className="eyebrow mb-3">Who we are</p>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-tight mb-4">
              A bold, people-powered movement for a cleaner Liberia
            </h2>
            <p className="text-[var(--color-ink-2)] mb-3.5">
              We are more than an environmental organization; we are a catalyst for community transformation. From the
              heart of rural villages to the busiest urban centres, we mobilize citizens, inspire action, and deliver
              practical solutions.
            </p>
            <p className="text-[var(--color-ink-2)] mb-5">
              Our work begins at the grassroots, where we educate, engage and equip communities to reclaim ownership of
              their environment.
            </p>
            <Link href="/about" className="btn btn-ghost">Learn more about us →</Link>
          </div>
          <div className="card p-6 lg:mt-8">
            <p className="eyebrow mb-4">At a glance</p>
            <dl className="grid gap-3.5 m-0">
              {[
                ["Founded", ORG.founded],
                ["Legal status", "Youth-led, non-governmental, non-profit, non-political"],
                ["Registered", `Liberia Business Registry, ${ORG.filed}`],
                ["Principal office", "Paynesville City, Montserrado County"],
                ["Motto", s.motto],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-3 items-baseline border-b border-[var(--color-line)] pb-3" style={{ gridTemplateColumns: "118px 1fr" }}>
                  <dt className="font-mono text-[0.72rem] tracking-[0.09em] uppercase text-[var(--color-ink-3)]">{k}</dt>
                  <dd className="m-0 text-[0.88rem] text-[var(--color-ink-2)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Mission, vision, values */}
      <section className="bg-[var(--color-surface-2)] py-16">
        <div className="wrap">
          <p className="eyebrow mb-3">Mission, vision &amp; values</p>
          <h2 className="text-[clamp(1.55rem,3vw,2.15rem)] leading-tight mb-8">What we are working towards</h2>
          <div className="grid gap-4 md:grid-cols-2 mb-5">
            <div className="card p-7 border-t-[3px] border-t-[var(--color-brand)]">
              <h3 className="text-[1.1rem] mb-2.5">Our Vision</h3>
              <p className="m-0 text-[var(--color-ink-2)] text-[0.94rem]">{ORG.vision}</p>
            </div>
            <div className="card p-7 border-t-[3px] border-t-[var(--color-brand-2)]">
              <h3 className="text-[1.1rem] mb-2.5">Our Mission</h3>
              <p className="m-0 text-[var(--color-ink-2)] text-[0.94rem]">{ORG.mission}</p>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-base mb-3.5">Our twelve core values</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {VALUES.map((v) => (
                <span key={v.name} className={"chip " + (v.placeholder ? "chip-hold" : "chip-ok")}>{v.name}</span>
              ))}
            </div>
            <Link href="/about/mission-vision-values" className="text-[0.86rem] font-semibold no-underline text-[var(--color-brand)] hover:underline">
              Read what each value means →
            </Link>
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="py-16">
        <div className="wrap">
          <p className="eyebrow mb-3">Our work</p>
          <h2 className="text-[clamp(1.55rem,3vw,2.15rem)] leading-tight mb-3">Five programmes, one alliance</h2>
          <p className="text-[var(--color-ink-2)] max-w-[64ch] mb-8">
            Each programme addresses a problem named in our founding analysis, and each is delivered with the community
            rather than for it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progs.map((p) => (
              <Link key={p.id} href={`/programs/${p.slug}`} className="card p-6 flex flex-col gap-2 no-underline text-inherit transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                <span className="grid place-items-center w-11 h-11 rounded-[10px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] mb-1 shrink-0">
                  <ProgramIcon name={p.icon} />
                </span>
                <h3 className="text-[1.06rem] leading-snug">{p.title}</h3>
                <p className="m-0 text-[var(--color-ink-2)] text-[0.895rem]">{p.activities[0]}.</p>
                <span className="mt-auto pt-3 text-[0.82rem] font-semibold text-[var(--color-brand)]">Explore programme →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Targets — labelled honestly */}
      <section className="py-16 text-white" style={{ background: "var(--color-brand)" }}>
        <div className="wrap">
          <p className="eyebrow mb-3" style={{ color: "#9FE0BB" }}>{s.impactBandLabel}</p>
          <h2 className="text-[clamp(1.55rem,3vw,2.15rem)] leading-tight mb-3 text-white">What we have committed to</h2>
          <p className="text-[#CBE8D8] max-w-[56ch] mb-8">
            CGZSA was founded in April 2025 and registered in September 2025. These are the goals we have set, shown
            honestly against progress to date — not achievements we have not yet earned.
          </p>
          <div className="grid gap-px rounded-lg overflow-hidden border border-white/20 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.id} className="bg-white/[0.06] px-6 py-6">
                <Counter to={m.target} />
                <div className="text-[0.83rem] text-[#BFDECD] mt-2">{m.label}</div>
                <div className="h-1 bg-white/20 rounded-sm mt-3 overflow-hidden">
                  <i className="block h-full bg-[var(--color-signal)] rounded-sm" style={{ width: `${Math.round((m.actual / m.target) * 100)}%` }} />
                </div>
                <div className="font-mono text-[0.68rem] text-[#9FCDB4] mt-1.5">
                  {m.actual} of {m.target} · {m.sublabel}
                </div>
              </div>
            ))}
            <div className="bg-white/[0.06] px-6 py-6">
              <div className="font-serif text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums">2025</div>
              <div className="text-[0.83rem] text-[#BFDECD] mt-2">Founded and registered</div>
              <div className="font-mono text-[0.68rem] text-[#9FCDB4] mt-3">20 April · filed 16 September</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="py-16">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-8">
            <div className="max-w-[56ch]">
              <p className="eyebrow mb-3">Why we exist</p>
              <h2 className="text-[clamp(1.55rem,3vw,2.15rem)] leading-tight">The problems that brought us together</h2>
            </div>
            <Link href="/about/why-we-were-founded" className="btn btn-ghost btn-sm">Read the full analysis →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FOUNDING.slice(0, 3).map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="font-sans text-base font-bold mb-1.5">{f.title}</h3>
                <p className="m-0 text-[0.865rem] text-[var(--color-ink-2)]">{f.points[0]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get involved */}
      <section className="bg-[var(--color-surface-2)] py-16">
        <div className="wrap">
          <p className="eyebrow mb-3">Get involved</p>
          <h2 className="text-[clamp(1.55rem,3vw,2.15rem)] leading-tight mb-8">Three ways to be part of this</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["/get-involved/volunteer", "Volunteer with us", "Help with clean-up drives, join our awareness teams, or offer your skills in media, fundraising or monitoring and evaluation."],
              ["/get-involved/partner", "Partner with us", "Sponsor a community project, contribute to a water tap or bench installation, or become a corporate or international partner."],
              ["/get-involved/donate", "Support our work", "Direct support for the installations, materials and training that make a clean-up or a water point actually happen."],
            ].map(([href, title, body]) => (
              <Link key={href} href={href} className="card p-6 no-underline text-inherit flex flex-col gap-2 transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                <h3 className="text-[1.06rem]">{title}</h3>
                <p className="m-0 text-[0.895rem] text-[var(--color-ink-2)]">{body}</p>
                <span className="mt-auto pt-3 text-[0.82rem] font-semibold text-[var(--color-brand)]">Read more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
