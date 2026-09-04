import { asc } from "drizzle-orm";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { PageHead } from "@/components/public/PageHead";

export const revalidate = 300;
export const metadata = { title: "Frequently Asked Questions" };

export default async function Faqs() {
  const list = await db.select().from(faqs).orderBy(asc(faqs.order));
  const anyDraft = list.some((f) => f.status !== "PUBLISHED");

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Resources"], ["FAQs"]]}
        eyebrow="Resources"
        title="Frequently Asked Questions"
        lede="Answers drawn from the CGZSA bylaws, registration documents and brochure."
      />
      <section className="py-14"><div className="wrap max-w-[820px]">
        {anyDraft && (
          <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-warn)] bg-[var(--color-warn-soft)] px-5 py-4 mb-5">
            <p className="font-bold text-[0.87rem] m-0 mb-1.5">Draft answers</p>
            <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">
              These questions and answers were drafted from the source documents and are marked for CGZSA review before
              publication. No FAQ list exists in the supplied files.
            </p>
          </div>
        )}
        <div className="card overflow-hidden">
          {list.map((f) => (
            <details key={f.id} className="border-b border-[var(--color-line)] last:border-0 group">
              <summary className="cursor-pointer px-5 py-4 font-semibold text-[0.96rem] flex items-center justify-between gap-3.5 hover:bg-[var(--color-surface-2)]">
                <span>{f.question}</span>
                <span className="text-[var(--color-brand)] text-xl leading-none shrink-0 group-open:hidden">+</span>
                <span className="text-[var(--color-brand)] text-xl leading-none shrink-0 hidden group-open:inline">−</span>
              </summary>
              <div className="px-5 pb-4.5 text-[0.9rem] text-[var(--color-ink-2)] max-w-[70ch]">
                {f.answer}
                {f.status !== "PUBLISHED" && <div className="mt-2.5"><span className="chip chip-hold">Draft — awaiting review</span></div>}
              </div>
            </details>
          ))}
        </div>
      </div></section>
    </>
  );
}
