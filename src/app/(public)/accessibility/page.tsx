import Link from "next/link";
import { PageHead } from "@/components/public/PageHead";

export const metadata = { title: "Accessibility Statement" };

export default function Accessibility() {
  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Accessibility"]]} eyebrow="Legal" title="Accessibility Statement"
        lede="Our commitment, what we have done, and how to tell us when we fall short." />
      <section className="py-14"><div className="wrap-narrow prose-cg max-w-none">
        <h2>Our commitment</h2>
        <p>CGZSA is committed to making this website usable by everyone, including people who use screen readers,
          keyboard-only navigation, magnification or voice control. We aim to meet WCAG 2.2 level AA.</p>
        <h2>What we have done</h2>
        <ul>
          <li>Text and interface elements are checked against a 4.5:1 contrast ratio.</li>
          <li>Every function is reachable by keyboard, with a visible focus indicator and a skip-to-content link.</li>
          <li>Pages use semantic landmarks, one main heading, and no skipped heading levels.</li>
          <li>Alt text is a required field in our content system — an image cannot be stored without it.</li>
          <li>Status and meaning are never carried by colour alone.</li>
          <li>Animation is disabled for visitors whose device asks for reduced motion.</li>
          <li>The live chat can be used entirely from the keyboard, and is labelled for screen readers.</li>
        </ul>
        <h2>Known limitations</h2>
        <p>Documents in the publications library are supplied as PDFs, and older files may not be fully tagged for
          screen readers. If you need a document in another format, <Link href="/contact">contact us</Link> and we will
          provide one.</p>
        <h2>Tell us</h2>
        <p>If you meet a barrier on this site, please tell us. We treat accessibility reports as priority defects.</p>
      </div></section>
    </>
  );
}
