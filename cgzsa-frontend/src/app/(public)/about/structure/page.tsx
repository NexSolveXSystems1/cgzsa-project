import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsMetadata("about/structure", {
    path: "/about/structure",
    title: "Organizational Structure",
    description: "Select any role to read the duties set out in the CGZSA organizational structure document.",
    image: STORY_IMAGES.communityCleanup,
  });
}

export default async function Structure() {
  const [team, page] = await Promise.all([
    db.select().from(teamMembers).where(isNull(teamMembers.deletedAt)).orderBy(asc(teamMembers.order)),
    getPublishedCmsPage("about/structure"),
  ]);
  const exec = team.filter((t) => t.group === "Executive Team");
  const depts = team.filter((t) => t.group === "Departments");
  const field = team.filter((t) => t.group === "Field Structure");
  const image = cmsImage(page, STORY_IMAGES.communityCleanup);

  const node = (title: string, sub: string, duties: string[]) => (
    <details key={title} className="card px-4.5 px-5 py-3 text-center min-w-[210px] group open:text-left">
      <summary className="cursor-pointer list-none">
        <b className="block text-[0.93rem] font-sans">{title}</b>
        <span className="text-[0.75rem] text-[var(--color-ink-3)]">{sub}</span>
      </summary>
      {duties.length > 0 && (
        <ul className="mt-2.5 pl-4 list-disc text-[0.8rem] text-[var(--color-ink-2)] text-left">
          {duties.map((d) => <li key={d} className="mb-1">{d}</li>)}
        </ul>
      )}
    </details>
  );

  const line = <div className="w-px h-6 bg-[var(--color-line-2)] mx-auto" />;

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["About", "/about"], [page?.title ?? "Structure"]]}
        eyebrow="About CGZSA"
        title={page?.title ?? "Organizational Structure"}
        lede={page?.excerpt ?? "Select any role to read the duties set out in the CGZSA organizational structure document."}
        image={image}
      />
      <CmsBody page={page} className="pt-10 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />
      <section className="py-14"><div className="wrap flex flex-col items-center">
        {node("General Assembly", "Supreme decision-making body · meets annually", [
          "Approves policies, budgets and strategic plans",
          "May amend the bylaws by a two-thirds majority",
        ])}
        {line}
        {node("Board of Directors", "Strategic oversight · meets quarterly", [
          "Chairperson, Vice Chairperson, Secretary, Treasurer and up to four additional members",
          "Provides strategic oversight and ensures accountability",
          "Oversees the performance of the Executive Director",
        ])}
        {line}
        {exec.map((e) => (
          <div key={e.id} className="contents">
            {node(e.role, e.name ?? "Appointment pending", e.duties)}
            {line}
          </div>
        ))}
        <div className="flex flex-wrap gap-3.5 justify-center mb-2">
          {depts.map((d) => node(d.role, d.name ?? "Appointment pending", d.duties))}
        </div>
        {line}
        <div className="flex flex-wrap gap-3.5 justify-center">
          {field.map((f) => node(f.role, f.name ?? "Appointment pending", f.duties))}
        </div>
      </div></section>
    </>
  );
}
