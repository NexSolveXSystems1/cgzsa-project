import { getSiteSettings } from "@/lib/settings";
import { PageHead } from "@/components/public/PageHead";
import { CmsPage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";

export async function generateMetadata() {
  return cmsMetadata("privacy-policy", {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description: "What we collect, why we collect it, and what we do with it.",
    image: STORY_IMAGES.publicSpace,
  });
}

export default async function Privacy() {
  const s = await getSiteSettings();
  const page = await getPublishedCmsPage("privacy-policy");

  if (page) {
    return (
      <CmsPage page={page} crumbs={[["Home", "/"], ["Privacy Policy"]]} eyebrow="Legal" fallbackImage={STORY_IMAGES.publicSpace} narrow />
    );
  }

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Privacy Policy"]]} eyebrow="Legal" title="Privacy Policy" lede="What we collect, why we collect it, and what we do with it." />
      <section className="py-14"><div className="wrap-narrow">
        <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-warn)] bg-[var(--color-warn-soft)] px-5 py-4 mb-6">
          <p className="font-bold text-[0.87rem] m-0 mb-1.5">Draft for CGZSA review</p>
          <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">
            This text was drafted to match what the website actually collects and stores. It has not been reviewed by a
            Liberian legal adviser.
          </p>
        </div>
        <div className="prose-cg max-w-none">
          <h2>Who we are</h2>
          <p>{s.orgName} ({s.shortName}), a registered not-for-profit NGO in the Republic of Liberia, principal office at {s.office}.</p>
          <h2>What we collect</h2>
          <ul>
            <li><b>Contact form.</b> Your name, email address, optional phone number, subject and message.</li>
            <li><b>Live chat.</b> The messages you send, an anonymous identifier stored in a cookie, and your email address only if you choose to give it.</li>
            <li><b>Volunteer application.</b> Your name, email, optional phone, county, area of interest and any note you add.</li>
            <li><b>Technical.</b> Anonymised page-view statistics. We do not use advertising trackers.</li>
          </ul>
          <h2>Why we collect it</h2>
          <p>Solely to reply to you, to process your volunteer application, and to send you updates you have asked for. We do not sell, rent or share your details with third parties.</p>
          <h2>How long we keep it</h2>
          <p>Contact messages are kept for 24 months and then deleted. Live chat transcripts are kept for 12 months and then deleted automatically. Volunteer applications are kept while your involvement is current, and for 12 months afterwards.</p>
          <h2>The assistant in our live chat</h2>
          <p>Our chat is answered first by an automated assistant. It is clearly labelled as such, it answers only from the pages published on this website, and it hands your conversation to a member of staff when it cannot help. Your messages are stored in our own database.</p>
          <h2>Your rights</h2>
          <p>You may ask us at any time for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. Write to us using the contact details on this site and we will respond within 30 days.</p>
          <h2>Security</h2>
          <p>Data is transmitted over HTTPS and stored in an access-controlled database. Only authorised CGZSA staff can read contact messages, chat transcripts and volunteer applications, and every access is recorded in an audit log.</p>
        </div>
      </div></section>
    </>
  );
}
