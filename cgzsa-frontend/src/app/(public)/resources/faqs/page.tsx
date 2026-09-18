import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsMetadata("resources/faqs", {
    path: "/resources/faqs",
    title: "Frequently Asked Questions",
    description: "Answers drawn from CGZSA public information and maintained by the content team.",
    image: STORY_IMAGES.communityCleanup,
  });
}

export default async function Faqs() {
  const [list, cmsPage] = await Promise.all([
    db.select().from(faqs).where(eq(faqs.status, "PUBLISHED")).orderBy(asc(faqs.order)),
    getPublishedCmsPage("resources/faqs"),
  ]);
  const image = cmsImage(cmsPage, STORY_IMAGES.communityCleanup);

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Resources"], ["FAQs"]]}
        eyebrow={cmsPage?.section ?? "Resources"}
        title={cmsPage?.title ?? "Frequently Asked Questions"}
        lede={cmsPage?.excerpt ?? "Answers drawn from CGZSA public information and maintained by the content team."}
        image={image}
      />
      <CmsBody page={cmsPage} className="pt-10 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />
      <section className="py-14">
        <div className="wrap max-w-[820px]">
          {list.length === 0 ? (
            <EmptyState
              title="No published FAQs yet"
              body="Answers created in the admin dashboard appear here after they are published."
            />
          ) : (
            <div className="card overflow-hidden">
              {list.map((f) => (
                <details key={f.id} className="border-b border-[var(--color-line)] last:border-0 group">
                  <summary className="cursor-pointer px-5 py-4 font-semibold text-[0.96rem] flex items-center justify-between gap-3.5 hover:bg-[var(--color-surface-2)]">
                    <span>{f.question}</span>
                    <span className="text-[var(--color-brand)] text-xl leading-none shrink-0 group-open:hidden">+</span>
                    <span className="text-[var(--color-brand)] text-xl leading-none shrink-0 hidden group-open:inline">-</span>
                  </summary>
                  <div className="px-5 pb-4.5 text-[0.9rem] text-[var(--color-ink-2)] max-w-[70ch]">
                    {f.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
