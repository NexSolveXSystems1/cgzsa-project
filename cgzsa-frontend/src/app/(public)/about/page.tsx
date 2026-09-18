import Link from "next/link";
import { PageHead } from "@/components/public/PageHead";
import { cmsBodyHtml, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";

export const revalidate = 300;

const SECTION = [
  ["/about/why-we-were-founded", "Why we were founded"],
  ["/about/mission-vision-values", "Mission, vision & values"],
  ["/about/goals-and-objectives", "Goals & objectives"],
  ["/about/leadership", "Leadership & team"],
  ["/about/governance", "Governance & registration"],
];

const FALLBACK_BODY = [
  "The Clean and Green Zero Sphere Alliance is a youth-led environmental organization working with communities in Liberia.",
  "CGZSA turns practical local action into visible improvements: clean-up drives, water access, public space recovery, safer waiting areas and flood prevention.",
];

export async function generateMetadata() {
  return cmsMetadata("about", {
    path: "/about",
    title: "Who We Are",
    description: "A youth-led, non-profit environmental organization founded in Liberia.",
    image: STORY_IMAGES.communityCleanup,
  });
}

export default async function About() {
  const page = await getPublishedCmsPage("about");
  const image = cmsImage(page, STORY_IMAGES.communityCleanup);

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["About"]]}
        eyebrow="About CGZSA"
        title={page?.title ?? "Who We Are"}
        lede={page?.excerpt ?? "A youth-led, non-profit environmental organization founded in Liberia."}
        image={image}
      />
      <section className="py-14">
        <div className="wrap grid gap-13 lg:grid-cols-[1fr_300px] items-start">
          <div className="prose-cg">
            {page ? (
              <div dangerouslySetInnerHTML={{ __html: cmsBodyHtml(page.body) }} />
            ) : (
              FALLBACK_BODY.map((p, i) => (
                <p key={p} className={i === 0 ? "text-[1.1rem] text-[var(--color-ink)]" : undefined}>{p}</p>
              ))
            )}
          </div>
          <aside className="card p-5 lg:sticky lg:top-28">
            <p className="eyebrow mb-3">In this section</p>
            {SECTION.map(([href, label]) => (
              <Link key={href} href={href} className="block py-2 border-b border-[var(--color-line)] last:border-0 text-[0.875rem] no-underline text-[var(--color-ink-2)] hover:text-[var(--color-brand)]">
                {label}
              </Link>
            ))}
          </aside>
        </div>
      </section>
    </>
  );
}
