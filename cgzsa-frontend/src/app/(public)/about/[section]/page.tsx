import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";
import { CmsPage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";
import { BYLAWS, CONDUCT, FOUNDING, GOALS, OBJECTIVES, ORG, VALUES } from "@/db/content";

export const revalidate = 300;

const TITLES: Record<string, [string, string]> = {
  "why-we-were-founded": ["Why CGZSA Was Founded", "Six pressing realities across Liberia, and what the Alliance was built to do about each of them."],
  "mission-vision-values": ["Mission, Vision & Values", "What we are working towards, and the principles that govern how we work."],
  "goals-and-objectives": ["Goals & Objectives", "Five goals set the destination. Seven objectives describe how we get there."],
  leadership: ["Leadership & Team", "Two co-founders are named in the organizational documents. Every other role is defined; post-holders will be published as appointments are confirmed."],
  governance: ["Governance & Registration", "How CGZSA is constituted, governed and held to account."],
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const t = TITLES[section];
  return t
    ? cmsMetadata(`about/${section}`, {
        path: `/about/${section}`,
        title: t[0],
        description: t[1],
        image: STORY_IMAGES.communityCleanup,
      })
    : {};
}

export default async function AboutSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = TITLES[section];
  if (!meta) notFound();
  const cmsPage = await getPublishedCmsPage(`about/${section}`);
  if (cmsPage) {
    return (
      <CmsPage
        page={cmsPage}
        crumbs={[["Home", "/"], ["About", "/about"], [cmsPage.title]]}
        eyebrow="About CGZSA"
        fallbackImage={STORY_IMAGES.communityCleanup}
      />
    );
  }

  const head = <PageHead crumbs={[["Home", "/"], ["About", "/about"], [meta[0]]]} eyebrow="About CGZSA" title={meta[0]} lede={meta[1]} />;

  if (section === "why-we-were-founded") {
    return (
      <>
        {head}
        <section className="py-14"><div className="wrap max-w-[78ch]">
          {FOUNDING.map((f, i) => (
            <div key={f.title} className="grid gap-5 py-7 border-b border-[var(--color-line)]" style={{ gridTemplateColumns: "52px 1fr" }}>
              <div className="font-mono text-[0.85rem] text-[var(--color-brand)] pt-1">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h2 className="text-[1.25rem] mb-3">{f.title}</h2>
                <ul className="m-0 mb-4 pl-5 list-disc text-[var(--color-ink-2)] text-[0.93rem]">
                  {f.points.map((p) => <li key={p} className="mb-1.5">{p}</li>)}
                </ul>
                <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-brand)] bg-white px-5 py-4">
                  <p className="font-bold text-[0.87rem] m-0 mb-1.5">Founding response</p>
                  <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">{f.response}</p>
                </div>
              </div>
            </div>
          ))}
        </div></section>
      </>
    );
  }

  if (section === "mission-vision-values") {
    return (
      <>
        {head}
        <section className="py-14"><div className="wrap">
          <div className="grid gap-4 md:grid-cols-2 mb-11">
            <div className="card p-8 border-t-4 border-t-[var(--color-brand)]">
              <p className="eyebrow mb-3">Our Vision</p>
              <p className="m-0 font-serif text-[1.2rem] leading-relaxed">{ORG.vision}</p>
            </div>
            <div className="card p-8 border-t-4 border-t-[var(--color-brand-2)]">
              <p className="eyebrow mb-3">Our Mission</p>
              <p className="m-0 font-serif text-[1.2rem] leading-relaxed">{ORG.mission}</p>
            </div>
          </div>
          <p className="eyebrow mb-3">Core values</p>
          <h2 className="text-[clamp(1.45rem,2.6vw,1.95rem)] mb-3">Twelve values, ten defined</h2>
          <p className="text-[var(--color-ink-2)] max-w-[64ch] mb-8">
            The values document defines ten; the brochure lists twelve. Transparency and Inclusiveness are shown here
            awaiting a written definition.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.name} className="card p-5">
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <h3 className="font-sans text-base font-bold m-0">{v.name}</h3>
                  {v.placeholder && <span className="chip chip-hold">Definition needed</span>}
                </div>
                <p className="m-0 text-[0.865rem] text-[var(--color-ink-2)]">
                  {v.placeholder
                    ? "This value appears on the CGZSA brochure but has no written definition in the source documents. A paragraph is needed before this page goes live."
                    : v.definition}
                </p>
              </div>
            ))}
          </div>
        </div></section>
      </>
    );
  }

  if (section === "goals-and-objectives") {
    const col = (label: string, heading: string, items: string[], prefix: string) => (
      <div>
        <p className="eyebrow mb-3">{label}</p>
        <h2 className="text-[1.4rem] mb-3.5">{heading}</h2>
        {items.map((x, i) => (
          <div key={x} className="grid gap-4 py-4 border-b border-[var(--color-line)]" style={{ gridTemplateColumns: "44px 1fr" }}>
            <span className="font-mono text-[var(--color-brand)] text-[0.82rem] pt-0.5">{prefix}{i + 1}</span>
            <p className="m-0 text-[var(--color-ink-2)]">{x}</p>
          </div>
        ))}
      </div>
    );
    return (
      <>
        {head}
        <section className="py-14"><div className="wrap grid gap-12 lg:grid-cols-2">
          {col("Five-year goals", "Where we are going", GOALS, "G")}
          {col("Objectives", "How we get there", OBJECTIVES, "O")}
        </div></section>
      </>
    );
  }

  if (section === "leadership") {
    const team = await db.select().from(teamMembers).orderBy(asc(teamMembers.order));
    const groups = ["Executive Team", "Board of Directors", "Departments", "Field Structure"];
    return (
      <>
        {head}
        <section className="py-14"><div className="wrap">
          {groups.map((g) => (
            <div key={g} className="mb-11">
              <div className="flex items-center gap-3.5 mb-5">
                <h2 className="text-[1.3rem]">{g}</h2>
                <div className="flex-1 h-px bg-[var(--color-line)]" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {team.filter((t) => t.group === g).map((m) => (
                  <div key={m.id} className="card p-5">
                    <div className="grid place-items-center w-14 h-14 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-line)] mb-3.5 font-serif text-[1.25rem] font-bold text-[var(--color-ink-3)]">
                      {m.name ? m.name.split(" ").map((w) => w[0]).slice(0, 2).join("") : "?"}
                    </div>
                    {m.name
                      ? <h3 className="text-[1.05rem] mb-1">{m.name}</h3>
                      : <div className="mb-1.5"><span className="chip chip-hold">Appointment pending</span></div>}
                    <p className="m-0 mb-3 text-[0.83rem] font-semibold text-[var(--color-brand)]">{m.role}</p>
                    <ul className="m-0 pl-4 list-disc text-[0.82rem] text-[var(--color-ink-2)]">
                      {m.duties.map((d) => <li key={d} className="mb-1">{d}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div></section>
      </>
    );
  }

  // governance
  return (
    <>
      {head}
      <section className="py-14"><div className="wrap">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[["Legal form", "Not-for-profit NGO"], ["Filed", ORG.filed], ["Registry", "Liberia Business Registry"], ["County", "Montserrado"]].map(([k, v]) => (
            <div key={k} className="card px-5 py-4">
              <div className="font-mono text-[0.66rem] tracking-[0.11em] uppercase text-[var(--color-ink-3)]">{k}</div>
              <div className="font-serif text-[1.1rem] font-semibold mt-1.5">{v}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-11 lg:grid-cols-[1.4fr_1fr] items-start">
          <div>
            <h2 className="text-[1.35rem] mb-4">Bylaws</h2>
            <div className="card overflow-hidden">
              {BYLAWS.map(([art, title, body]) => (
                <details key={art} className="border-b border-[var(--color-line)] last:border-0 group">
                  <summary className="cursor-pointer px-5 py-4 font-semibold text-[0.96rem] flex items-center justify-between gap-3.5 hover:bg-[var(--color-surface-2)]">
                    <span><span className="font-mono text-[0.75rem] text-[var(--color-brand)] mr-2.5">{art}</span>{title}</span>
                    <span className="text-[var(--color-brand)] text-xl leading-none shrink-0 group-open:hidden">+</span>
                    <span className="text-[var(--color-brand)] text-xl leading-none shrink-0 hidden group-open:inline">−</span>
                  </summary>
                  <div className="px-5 pb-4.5 text-[0.9rem] text-[var(--color-ink-2)] max-w-[70ch]">{body}</div>
                </details>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-[1.35rem] mb-4">Code of Conduct</h2>
            <div className="card p-5">
              {CONDUCT.map((c, i) => (
                <div key={c.title} className={"py-3 " + (i === 0 ? "pt-0 " : "") + (i === CONDUCT.length - 1 ? "" : "border-b border-[var(--color-line)]")}>
                  <b className="block text-[0.88rem] mb-1">{c.title}</b>
                  <span className="text-[0.83rem] text-[var(--color-ink-2)]">{c.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div></section>
    </>
  );
}
