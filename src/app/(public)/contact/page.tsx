import { getSiteSettings } from "@/lib/settings";
import { PageHead } from "@/components/public/PageHead";
import { ContactForm } from "@/components/public/ContactForm";

export const metadata = { title: "Contact Us" };

export default async function Contact() {
  const s = await getSiteSettings();
  const phones = [s.phone1, s.phone2, s.phone3].filter(Boolean) as string[];

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Contact"]]}
        eyebrow="Contact"
        title="Contact Us"
        lede={`Our office is at ${s.office.split(",").slice(0, 2).join(",")}. We answer every message.`}
      />
      <section className="py-14">
        <div className="wrap grid gap-13 lg:grid-cols-[1fr_380px] items-start">
          <ContactForm />
          <aside className="grid gap-4">
            <div className="card p-6">
              <p className="eyebrow mb-3">Principal office</p>
              <p className="text-[0.9rem] text-[var(--color-ink-2)] mb-4">{s.office}</p>
              <p className="eyebrow mb-2">Email</p>
              <a href={`mailto:${s.email}`} className="text-[0.86rem] break-all block mb-4">{s.email}</a>
              <p className="eyebrow mb-2">Telephone</p>
              <div className="font-mono text-[0.84rem] text-[var(--color-ink-2)] leading-loose">
                {phones.map((p) => <div key={p}>{p}</div>)}
              </div>
            </div>
            <div className="card p-6">
              <p className="eyebrow mb-3">Office hours</p>
              <p className="m-0 text-[0.87rem] text-[var(--color-ink-2)]">
                {s.officeHours ?? <span className="chip chip-hold">Not yet supplied</span>}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
