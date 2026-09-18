import Link from "next/link";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { impactMetrics, mediaAssets, programs } from "@/db/schema";
import { getSiteSettings } from "@/lib/settings";
import { FOUNDING, ORG, VALUES } from "@/db/content";
import { ProgramIcon } from "@/components/public/ProgramIcon";
import { Counter } from "@/components/public/Counter";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { BlockBody, blockMap, blockPlainText, blockText, getPublishedContentBlocks } from "@/components/public/contentBlocks";
import { mediaStoryImage, STORY_IMAGES, type StoryImage, programmeImage } from "@/components/public/storyImages";

export const revalidate = 300;

const HERO_ACTIONS = [
  { slot: "hero-action-cleanup", title: "Clean up streets" },
  { slot: "hero-action-parks", title: "Restore parks" },
  { slot: "hero-action-water", title: "Install water points" },
  { slot: "hero-action-flooding", title: "Protect drains" },
  { slot: "hero-action-youth", title: "Train youth teams" },
];

const ACTION_CARDS = [
  {
    slot: "action-volunteer",
    href: "/get-involved/volunteer",
    title: "Volunteer",
    body: "Join clean-up days, awareness teams, media support or monitoring work.",
  },
  {
    slot: "action-partner",
    href: "/get-involved/partner",
    title: "Partner",
    body: "Back a water point, park recovery, bus-stop bench or school campaign.",
  },
  {
    slot: "action-donate",
    href: "/get-involved/donate",
    title: "Support",
    body: "Help fund tools, materials, installations and the training that keeps them working.",
  },
];

const HOME_BLOCK_SLOTS = [
  "hero-primary-cta",
  "hero-secondary-cta",
  ...HERO_ACTIONS.map((item) => item.slot),
  "zero-sphere",
  "intro",
  "intro-local",
  "intro-youth",
  "intro-practical",
  "values",
  "vision",
  "mission",
  "programmes",
  "impact",
  "why",
  "get-involved",
  ...ACTION_CARDS.map((item) => item.slot),
];

export async function generateMetadata() {
  const s = await getSiteSettings();
  return cmsMetadata("home", {
    path: "/",
    title: s.orgName,
    description: s.defaultDescription,
    image: STORY_IMAGES.communityCleanup,
  });
}

export default async function Home() {
  const s = await getSiteSettings();
  const imageIds = [
    s.homeHeroImageId,
    s.homeIntroImageId,
    s.homeWasteImageId,
    s.homePublicSpaceImageId,
    s.homeWaterImageId,
    s.homeVolunteerImageId,
    s.homePartnerImageId,
    s.homeDonateImageId,
  ].filter((value): value is string => Boolean(value));
  const homeMedia = imageIds.length
    ? db
        .select({ id: mediaAssets.id, key: mediaAssets.storageKey, alt: mediaAssets.altText })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, imageIds))
    : Promise.resolve([] as { id: string; key: string; alt: string }[]);

  const [progs, metrics, mediaRows, cmsPage, contentBlockRows] = await Promise.all([
    db.select().from(programs).where(and(eq(programs.status, "PUBLISHED"), isNull(programs.deletedAt))).orderBy(asc(programs.order)),
    db.select().from(impactMetrics).orderBy(asc(impactMetrics.order)),
    homeMedia,
    getPublishedCmsPage("home"),
    getPublishedContentBlocks("home", HOME_BLOCK_SLOTS),
  ]);
  const mediaById = new Map(mediaRows.map((row) => [row.id, row]));
  const blocks = blockMap(contentBlockRows);
  const getBlock = (slot: string) => blocks.get(slot);
  const slotImage = (id: string | null | undefined, fallback: StoryImage) => {
    const row = id ? mediaById.get(id) : null;
    return mediaStoryImage(row?.key, row?.alt, fallback);
  };
  const homeImages = {
    hero: cmsImage(cmsPage, slotImage(s.homeHeroImageId, STORY_IMAGES.communityCleanup)),
    intro: slotImage(s.homeIntroImageId, STORY_IMAGES.safeWater),
    waste: slotImage(s.homeWasteImageId, STORY_IMAGES.wasteAction),
    publicSpace: slotImage(s.homePublicSpaceImageId, STORY_IMAGES.publicSpace),
    water: slotImage(s.homeWaterImageId, STORY_IMAGES.safeWater),
    volunteer: slotImage(s.homeVolunteerImageId, STORY_IMAGES.communityCleanup),
    partner: slotImage(s.homePartnerImageId, STORY_IMAGES.busStop),
    donate: slotImage(s.homeDonateImageId, STORY_IMAGES.safeWater),
  };
  const foundingImages = [homeImages.waste, homeImages.publicSpace, homeImages.water];
  const actionImages = [homeImages.volunteer, homeImages.partner, homeImages.donate];
  const heroPrimary = blockText(getBlock("hero-primary-cta"), {
    title: "Explore programmes",
    ctaLabel: "Explore programmes",
    ctaHref: "/programs",
  });
  const heroSecondary = blockText(getBlock("hero-secondary-cta"), {
    title: "Volunteer with us",
    ctaLabel: "Volunteer with us",
    ctaHref: "/get-involved/volunteer",
  });
  const heroActions = HERO_ACTIONS.map((item) => blockText(getBlock(item.slot), { title: item.title }).title);
  const zeroSphere = blockText(getBlock("zero-sphere"), {
    title: "Zero x 3",
    body: "Zero pollution, zero unsafe water, zero wasted potential. That is the plain promise behind the name.",
  });
  const intro = blockText(getBlock("intro"), {
    eyebrow: "Who we are",
    title: "Practical work people can see, join and trust",
    body: "CGZSA turns big environmental problems into visible community work: clean-up drives, water access, park recovery, safer waiting areas and flood prevention.",
    ctaLabel: "Learn more",
    ctaHref: "/about",
  });
  const introBadges = [
    { slot: "intro-local", title: "Local", body: "Community-owned action" },
    { slot: "intro-youth", title: "Youth-led", body: "Training and service" },
    { slot: "intro-practical", title: "Practical", body: "Visible public improvements" },
  ].map((item) => {
    const block = getBlock(item.slot);
    return {
      title: blockText(block, { title: item.title }).title,
      body: blockPlainText(block, item.body),
    };
  });
  const valuesBlock = blockText(getBlock("values"), {
    eyebrow: "Mission, vision & values",
    title: "What we are working towards",
    body: "CGZSA is guided by its mission, vision and core values, with public updates as definitions are confirmed by the organization.",
    ctaLabel: "Read what each value means",
    ctaHref: "/about/mission-vision-values",
  });
  const visionBlock = blockText(getBlock("vision"), { title: "Our Vision", body: ORG.vision });
  const missionBlock = blockText(getBlock("mission"), { title: "Our Mission", body: ORG.mission });
  const programmesBlock = blockText(getBlock("programmes"), {
    eyebrow: "Our work",
    title: "Five programmes, one alliance",
    body: "Each programme is a concrete way for communities, partners and volunteers to act.",
  });
  const impactBlock = blockText(getBlock("impact"), {
    eyebrow: s.impactBandLabel,
    title: "What we have committed to",
    body: "CGZSA was founded in April 2025 and registered in September 2025. These are targets, shown honestly against progress to date.",
  });
  const whyBlock = blockText(getBlock("why"), {
    eyebrow: "Why we exist",
    title: "The problems that brought us together",
    body: "The founding problems are the practical reason the Alliance exists: waste, unsafe water, degraded public spaces and flood risk.",
    ctaLabel: "Read the analysis",
    ctaHref: "/about/why-we-were-founded",
  });
  const getInvolvedBlock = blockText(getBlock("get-involved"), {
    eyebrow: "Get involved",
    title: "Three ways to be part of this",
    body: "Choose the route that fits you: volunteer time, partner on a project, or support the materials and training behind the work.",
  });
  const actionCards = ACTION_CARDS.map((item) => {
    const block = getBlock(item.slot);
    const text = blockText(block, {
      title: item.title,
      body: item.body,
      ctaLabel: "Read more",
      ctaHref: item.href,
    });
    return {
      href: text.ctaHref || item.href,
      title: text.title,
      body: blockPlainText(block, item.body),
      ctaLabel: text.ctaLabel || "Read more",
    };
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#07160d] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={homeImages.hero.src} alt="" aria-hidden="true" className="hero-photo-pan absolute inset-0 h-full w-full object-cover opacity-[0.78]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,9,0.94)_0%,rgba(0,50,28,0.84)_45%,rgba(0,0,0,0.12)_100%)]" />
        <div className="wrap relative py-14 sm:py-16 lg:py-20">
          <div className="max-w-[760px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#BFF0D3]/35 bg-black/20 px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.17em] uppercase text-[#BFF0D3] mb-6">
              Youth-led / Registered NGO / Liberia
            </span>
            <div className="h-[5px] w-[104px] bg-[var(--color-signal)] rounded-sm mb-6" />
            <h1 className="text-3xl sm:text-5xl lg:text-6xl leading-[1.03] max-w-[13ch] text-white mb-5">
              {cmsPage?.title ?? "Clean and Green Zero Sphere Alliance"}
            </h1>
            <p className={"text-lg sm:text-xl max-w-[28ch] sm:max-w-[42ch] text-[#D6EEE0] " + (cmsPage ? "mb-8" : "mb-3")}>
              {cmsPage?.excerpt ?? s.strapline}
            </p>
            {!cmsPage && (
              <p className="text-[0.98rem] max-w-[31ch] sm:max-w-[58ch] text-white/78 mb-8">
                Youth and communities taking practical action on waste, unsafe water, neglected public spaces and flooding.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={heroPrimary.ctaHref || "/programs"} className="btn btn-light w-full sm:w-auto">{heroPrimary.ctaLabel || heroPrimary.title}</Link>
              <Link href={heroSecondary.ctaHref || "/get-involved/volunteer"} className="btn btn-onbrand w-full sm:w-auto">{heroSecondary.ctaLabel || heroSecondary.title}</Link>
            </div>
          </div>

          <div className="relative mt-10 overflow-visible md:overflow-hidden border-y border-white/20 py-3" aria-label="CGZSA action areas">
            <div className="work-strip-track flex w-full max-w-[358px] flex-wrap gap-2.5 sm:max-w-none sm:gap-3 md:w-max md:flex-nowrap">
              {[...heroActions, ...heroActions].map((item, i) => (
                <span key={`${item}-${i}`} className={"chip chip-none border-white/25 bg-white/10 text-white/90 " + (i >= HERO_ACTIONS.length ? "hidden md:inline-flex" : "")}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CmsBody page={cmsPage} className="pt-12 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />

      {/* The Zero Sphere */}
      <section className="bg-[var(--color-surface)] border-b border-[var(--color-line)] py-10">
        <div className="wrap grid gap-6 items-center lg:grid-cols-[auto_1fr]">
          <div className="font-serif text-5xl lg:text-6xl font-bold text-[var(--color-brand)] leading-none whitespace-nowrap">
            {zeroSphere.title}
          </div>
          <div className="prose-cg max-w-[62ch] text-[1.02rem] text-[var(--color-ink-2)]">
            <BlockBody block={getBlock("zero-sphere")} fallback={zeroSphere.body} />
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_0.92fr] items-center">
          <div>
            <p className="eyebrow mb-3">{intro.eyebrow}</p>
            <h2 className="text-3xl lg:text-4xl leading-tight mb-4">
              {intro.title}
            </h2>
            <div className="prose-cg max-w-[62ch] text-[var(--color-ink-2)] mb-5">
              <BlockBody block={getBlock("intro")} fallback={intro.body} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              {introBadges.map((badge) => (
                <div key={badge.title} className="border-l-[3px] border-[var(--color-brand)] bg-white px-4 py-3">
                  <b className="block text-[0.92rem]">{badge.title}</b>
                  <span className="text-[0.78rem] text-[var(--color-ink-3)]">{badge.body}</span>
                </div>
              ))}
            </div>
            <Link href={intro.ctaHref || "/about"} className="btn btn-ghost">{intro.ctaLabel || "Learn more"}</Link>
          </div>
          <figure className="m-0 overflow-hidden rounded-lg border border-[var(--color-line)] bg-white shadow-sm">
            <div className="story-image aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={homeImages.intro.src} alt={homeImages.intro.alt} />
            </div>
            <figcaption className="grid gap-3 p-4 sm:grid-cols-3">
              <span><b className="block text-[0.86rem]">Founded</b><span className="text-[0.78rem] text-[var(--color-ink-3)]">{ORG.founded}</span></span>
              <span><b className="block text-[0.86rem]">Office</b><span className="text-[0.78rem] text-[var(--color-ink-3)]">Paynesville City</span></span>
              <span><b className="block text-[0.86rem]">Motto</b><span className="text-[0.78rem] text-[var(--color-ink-3)]">{s.motto}</span></span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Mission, vision, values */}
      <section className="bg-[var(--color-surface-2)] py-16">
        <div className="wrap">
          <p className="eyebrow mb-3">{valuesBlock.eyebrow}</p>
          <h2 className="text-3xl lg:text-4xl leading-tight mb-3">{valuesBlock.title}</h2>
          <div className="prose-cg max-w-[62ch] text-[var(--color-ink-2)] mb-8">
            <BlockBody block={getBlock("values")} fallback={valuesBlock.body} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 mb-5">
            <div className="card p-7 border-t-[3px] border-t-[var(--color-brand)]">
              <h3 className="text-[1.1rem] mb-2.5">{visionBlock.title}</h3>
              <div className="prose-cg text-[var(--color-ink-2)] text-[0.94rem]">
                <BlockBody block={getBlock("vision")} fallback={visionBlock.body} />
              </div>
            </div>
            <div className="card p-7 border-t-[3px] border-t-[var(--color-brand-2)]">
              <h3 className="text-[1.1rem] mb-2.5">{missionBlock.title}</h3>
              <div className="prose-cg text-[var(--color-ink-2)] text-[0.94rem]">
                <BlockBody block={getBlock("mission")} fallback={missionBlock.body} />
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-base mb-3.5">Our twelve core values</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {VALUES.map((v) => (
                <span key={v.name} className={"chip " + (v.placeholder ? "chip-hold" : "chip-ok")}>{v.name}</span>
              ))}
            </div>
            <Link href={valuesBlock.ctaHref || "/about/mission-vision-values"} className="text-[0.86rem] font-semibold no-underline text-[var(--color-brand)] hover:underline">
              {valuesBlock.ctaLabel || "Read what each value means"}
            </Link>
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="py-16">
        <div className="wrap">
          <p className="eyebrow mb-3">{programmesBlock.eyebrow}</p>
          <h2 className="text-3xl lg:text-4xl leading-tight mb-3">{programmesBlock.title}</h2>
          <div className="prose-cg max-w-[64ch] text-[var(--color-ink-2)] mb-8">
            <BlockBody block={getBlock("programmes")} fallback={programmesBlock.body} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progs.map((p) => {
              const image = programmeImage(p.slug);
              return (
                <Link key={p.id} href={`/programs/${p.slug}`} className="group card overflow-hidden flex flex-col no-underline text-inherit transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="story-image relative aspect-[4/3]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} />
                    <span className="absolute left-4 top-4 grid place-items-center w-11 h-11 rounded-lg bg-white/92 text-[var(--color-brand)] shadow-sm">
                      <ProgramIcon name={p.icon} />
                    </span>
                  </div>
                  <div className="p-5 flex flex-1 flex-col gap-2">
                    <span className="chip chip-mute chip-none w-fit">{p.tagline}</span>
                    <h3 className="text-[1.06rem] leading-snug">{p.title}</h3>
                    <p className="m-0 text-[var(--color-ink-2)] text-[0.895rem] line-clamp-2">{p.activities[0]}.</p>
                    <span className="mt-auto pt-3 text-[0.82rem] font-semibold text-[var(--color-brand)]">Explore programme</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Targets */}
      <section className="py-16 text-white" style={{ background: "var(--color-brand)" }}>
        <div className="wrap">
          <p className="eyebrow mb-3" style={{ color: "#9FE0BB" }}>{impactBlock.eyebrow}</p>
          <h2 className="text-3xl lg:text-4xl leading-tight mb-3 text-white">{impactBlock.title}</h2>
          <div className="prose-cg max-w-[56ch] text-[#CBE8D8] mb-8">
            <BlockBody block={getBlock("impact")} fallback={impactBlock.body} />
          </div>
          <div className="grid gap-px rounded-lg overflow-hidden border border-white/20 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.id} className="bg-white/[0.06] px-6 py-6">
                <Counter to={m.target} />
                <div className="text-[0.83rem] text-[#BFDECD] mt-2">{m.label}</div>
                <div className="h-1 bg-white/20 rounded-sm mt-3 overflow-hidden">
                  <i className="block h-full bg-[var(--color-signal)] rounded-sm" style={{ width: `${Math.round((m.actual / m.target) * 100)}%` }} />
                </div>
                <div className="font-mono text-[0.68rem] text-[#9FCDB4] mt-1.5">
                  {m.actual} of {m.target} / {m.sublabel}
                </div>
              </div>
            ))}
            <div className="bg-white/[0.06] px-6 py-6">
              <div className="font-serif text-[2.5rem] font-bold leading-none tabular-nums">2025</div>
              <div className="text-[0.83rem] text-[#BFDECD] mt-2">Founded and registered</div>
              <div className="font-mono text-[0.68rem] text-[#9FCDB4] mt-3">20 April / filed 16 September</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="py-16">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-8">
            <div className="max-w-[56ch]">
              <p className="eyebrow mb-3">{whyBlock.eyebrow}</p>
              <h2 className="text-3xl lg:text-4xl leading-tight">{whyBlock.title}</h2>
              <div className="prose-cg mt-3 text-[var(--color-ink-2)]">
                <BlockBody block={getBlock("why")} fallback={whyBlock.body} />
              </div>
            </div>
            <Link href={whyBlock.ctaHref || "/about/why-we-were-founded"} className="btn btn-ghost btn-sm">{whyBlock.ctaLabel || "Read the analysis"}</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FOUNDING.slice(0, 3).map((f, i) => {
              const image = foundingImages[i];
              return (
                <div key={f.title} className="card overflow-hidden">
                  <div className="story-image aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} />
                  </div>
                  <div className="p-5">
                    <h3 className="font-sans text-base font-bold mb-1.5">{f.title}</h3>
                    <p className="m-0 text-[0.865rem] text-[var(--color-ink-2)] line-clamp-3">{f.points[0]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Get involved */}
      <section className="bg-[var(--color-surface-2)] py-16">
        <div className="wrap">
          <p className="eyebrow mb-3">{getInvolvedBlock.eyebrow}</p>
          <h2 className="text-3xl lg:text-4xl leading-tight mb-3">{getInvolvedBlock.title}</h2>
          <div className="prose-cg max-w-[62ch] text-[var(--color-ink-2)] mb-8">
            <BlockBody block={getBlock("get-involved")} fallback={getInvolvedBlock.body} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {actionCards.map(({ href, title, body, ctaLabel }, i) => {
              const image = actionImages[i];
              return (
              <Link key={href} href={href} className="group card overflow-hidden no-underline text-inherit flex flex-col transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                <div className="story-image aspect-[16/10]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.alt} />
                </div>
                <div className="p-6 flex flex-1 flex-col gap-2">
                  <h3 className="text-[1.06rem]">{title}</h3>
                  <p className="m-0 text-[0.895rem] text-[var(--color-ink-2)]">{body}</p>
                  <span className="mt-auto pt-3 text-[0.82rem] font-semibold text-[var(--color-brand)]">{ctaLabel}</span>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
