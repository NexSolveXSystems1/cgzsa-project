import { getSiteSettings } from "@/lib/settings";
import { PageHead } from "@/components/public/PageHead";
import { CmsPage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";

export async function generateMetadata() {
  return cmsMetadata("terms", {
    path: "/terms",
    title: "Terms of Use",
    description: "The terms on which this website is provided.",
    image: STORY_IMAGES.publicSpace,
  });
}

export default async function Terms() {
  const s = await getSiteSettings();
  const page = await getPublishedCmsPage("terms");
  if (page) return <CmsPage page={page} crumbs={[["Home", "/"], ["Terms of Use"]]} eyebrow="Legal" fallbackImage={STORY_IMAGES.publicSpace} narrow />;

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Terms of Use"]]} eyebrow="Legal" title="Terms of Use"
        lede="The terms on which this website is provided." />
      <section className="py-14"><div className="wrap-narrow prose-cg max-w-none">
        <h2>Acceptance</h2>
        <p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p>
        <h2>Content</h2>
        <p>The information here is provided in good faith and for general information. {s.orgName} takes care to keep it
          accurate and current but does not guarantee that every page is free of error or fully up to date.</p>
        <h2>The assistant in our live chat</h2>
        <p>Our chat is answered first by an automated assistant that draws only on the pages published on this website.
          Its answers are not professional advice and do not create any commitment on the part of {s.shortName}. Where
          something matters, ask for a person — the assistant will pass you to one.</p>
        <h2>Intellectual property</h2>
        <p>The {s.shortName} name, logo and motto, and the text and images on this site, belong to {s.orgName} unless
          otherwise stated. Documents in the publications library may be downloaded and shared for non-commercial
          purposes with attribution.</p>
        <h2>Acceptable use</h2>
        <p>You may not attempt to gain unauthorised access to any part of this site, submit malicious content through any
          form or the chat, or use automated tools to place unreasonable load on the service.</p>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of the Republic of Liberia.</p>
      </div></section>
    </>
  );
}
