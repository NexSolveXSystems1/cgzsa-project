import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, programs } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";
import { ProgramIcon } from "@/components/public/ProgramIcon";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES, programmeImage } from "@/components/public/storyImages";
import { settingImage } from "@/components/public/settingImage";
import { getSiteSettings } from "@/lib/settings";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsMetadata("programs", {
    path: "/programs",
    title: "Programmes",
    description: "Five permanent programme areas, each tied to visible action in a community.",
    image: STORY_IMAGES.communityCleanup,
  });
}

export default async function Programs() {
  const settings = await getSiteSettings();
  const [list, headerFallback, cmsPage] = await Promise.all([
    db
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.title,
      tagline: programs.tagline,
      lead: programs.lead,
      activities: programs.activities,
      icon: programs.icon,
      imageKey: mediaAssets.storageKey,
      imageAlt: mediaAssets.altText,
    })
    .from(programs)
    .leftJoin(mediaAssets, eq(mediaAssets.id, programs.imageId))
    .where(and(eq(programs.status, "PUBLISHED"), isNull(programs.deletedAt)))
    .orderBy(asc(programs.order)),
    settingImage(settings.programsPageImageId, STORY_IMAGES.communityCleanup),
    getPublishedCmsPage("programs"),
  ]);
  const headerImage = cmsImage(cmsPage, headerFallback);

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Programmes"]]}
        eyebrow={cmsPage?.section ?? "Our work"}
        title={cmsPage?.title ?? "Programmes"}
        lede={cmsPage?.excerpt ?? "Five permanent programme areas, each tied to visible action in a community."}
        image={headerImage}
      />
      <CmsBody page={cmsPage} className="pt-10 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />
      <section className="py-14">
        <div className="wrap grid gap-4 md:grid-cols-2">
          {list.map((p) => {
            const fallback = programmeImage(p.slug);
            const image = p.imageKey
              ? { src: `/api/media/${p.imageKey}`, alt: p.imageAlt ?? p.title }
              : fallback;

            return (
              <Link key={p.id} href={`/programs/${p.slug}`} className="group card overflow-hidden no-underline text-inherit flex flex-col transition hover:border-[var(--color-brand)] hover:-translate-y-0.5 hover:shadow-lg">
                <div className="story-image relative aspect-[16/9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.alt} />
                  <span className="absolute left-4 top-4 grid place-items-center w-11 h-11 rounded-lg bg-white/92 text-[var(--color-brand)] shadow-sm">
                    <ProgramIcon name={p.icon} />
                  </span>
                </div>
                <div className="p-6 flex flex-1 flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="chip chip-mute chip-none">{p.tagline}</span>
                  </div>
                  <h2 className="text-[1.2rem]">{p.title}</h2>
                  <p className="m-0 text-[var(--color-ink-2)] text-[0.895rem] line-clamp-3">{p.lead}</p>
                  <ul className="m-0 mt-1 pl-5 list-disc text-[0.85rem] text-[var(--color-ink-2)]">
                    {p.activities.slice(0, 2).map((a) => <li key={a} className="mb-1">{a}</li>)}
                  </ul>
                  <span className="mt-auto pt-3 text-[0.82rem] font-semibold text-[var(--color-brand)]">Programme detail</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
