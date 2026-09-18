import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, programs, projects } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { mediaStoryImage, STORY_IMAGES, programmeImage } from "@/components/public/storyImages";
import { settingImage } from "@/components/public/settingImage";
import { formatDate } from "@/lib/format";
import { getSiteSettings } from "@/lib/settings";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsMetadata("projects", {
    path: "/projects",
    title: "Projects",
    description: "Individual clean-ups, installations and restorations, by programme, county and status.",
    image: STORY_IMAGES.floodCleanup,
  });
}

const PS: Record<string, [string, string]> = {
  PLANNED: ["Planned", "chip-mute"],
  IN_PROGRESS: ["In progress", "chip-info"],
  COMPLETED: ["Completed", "chip-ok"],
  ON_HOLD: ["On hold", "chip-warn"],
};

export default async function Projects({ searchParams }: { searchParams: Promise<{ programme?: string; county?: string }> }) {
  const q = await searchParams;
  const settings = await getSiteSettings();

  const [rows, headerFallback, cmsPage] = await Promise.all([
    db.select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      county: projects.county,
      projectStatus: projects.projectStatus,
      startDate: projects.startDate,
      programme: programs.title,
      programmeSlug: programs.slug,
      imageKey: mediaAssets.storageKey,
      imageAlt: mediaAssets.altText,
    })
    .from(projects)
    .leftJoin(programs, eq(programs.id, projects.programId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, projects.imageId))
    .where(and(eq(projects.status, "PUBLISHED"), isNull(projects.deletedAt)))
    .orderBy(desc(projects.startDate)),
    settingImage(settings.projectsPageImageId, STORY_IMAGES.floodCleanup),
    getPublishedCmsPage("projects"),
  ]);
  const headerImage = cmsImage(cmsPage, headerFallback);

  const progs = [...new Map(rows.filter((r) => r.programmeSlug).map((r) => [r.programmeSlug!, r.programme!])).entries()];
  const counties = [...new Set(rows.map((r) => r.county).filter(Boolean))] as string[];
  const shown = rows.filter((r) =>
    (!q.programme || r.programmeSlug === q.programme) && (!q.county || r.county === q.county));

  const pill = (label: string, href: string, active: boolean) => (
    <Link key={href} href={href} className={"rounded-full border px-3.5 py-1.5 text-[0.83rem] no-underline " +
      (active ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-semibold" : "bg-white border-[var(--color-line)] text-[var(--color-ink-2)]")}>
      {label}
    </Link>
  );

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Projects"]]}
        eyebrow={cmsPage?.section ?? "Our work"}
        title={cmsPage?.title ?? "Projects"}
        lede={cmsPage?.excerpt ?? "Individual clean-ups, installations and restorations, by programme, county and status."}
        image={headerImage}
      />
      <CmsBody page={cmsPage} className="pt-10 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />
      <section className="py-14"><div className="wrap">
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            {pill("All", "/projects", !q.programme && !q.county)}
            {progs.map(([slug, name]) => pill(name, `/projects?programme=${slug}`, q.programme === slug))}
            {counties.map((c) => pill(c, `/projects?county=${encodeURIComponent(c)}`, q.county === c))}
          </div>
        )}

        {shown.length === 0 ? (
          <EmptyState title="No projects published yet"
            body="A project is a specific installation in a specific place, with a start date, a county and a status. The first will appear here as soon as it is published." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => {
              const image = mediaStoryImage(p.imageKey, p.imageAlt, programmeImage(p.programmeSlug));
              return (
                <Link key={p.id} href={`/projects/${p.slug}`} className="group card overflow-hidden no-underline text-inherit flex flex-col transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="story-image aspect-[16/10]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} />
                  </div>
                  <div className="p-5 flex flex-1 flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className={"chip " + PS[p.projectStatus][1]}>{PS[p.projectStatus][0]}</span>
                      {p.county && <span className="chip chip-mute chip-none">{p.county}</span>}
                    </div>
                    <h2 className="text-[1.05rem] leading-snug">{p.title}</h2>
                    <p className="m-0 text-[0.87rem] text-[var(--color-ink-2)] line-clamp-3">{p.summary}</p>
                    <div className="mt-auto pt-2.5 font-mono text-[0.74rem] text-[var(--color-ink-3)]">
                      {p.programme ?? "Not assigned"}{p.startDate ? ` / ${formatDate(p.startDate)}` : ""}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div></section>
    </>
  );
}
