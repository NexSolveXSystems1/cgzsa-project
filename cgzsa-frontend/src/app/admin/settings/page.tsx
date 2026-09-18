import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2, Note } from "@/components/admin/kit";
import { SaveForm } from "@/components/admin/SaveForm";
import { getSiteSettings } from "@/lib/settings";
import { saveSiteSettings } from "./actions";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { and, desc, isNull, like } from "drizzle-orm";

import { MediaPicker } from "@/components/admin/MediaPicker";

export const dynamic = "force-dynamic";

const HOME_IMAGE_FIELDS = [
  ["homeHeroImageId", "Homepage hero", "The large first image behind the main message."],
  ["homeIntroImageId", "Homepage introduction", "The image beside the Who we are section."],
  ["homeWasteImageId", "Waste problem card", "Used in the Why we exist section."],
  ["homePublicSpaceImageId", "Public spaces card", "Used in the Why we exist section."],
  ["homeWaterImageId", "Water problem card", "Used in the Why we exist section."],
  ["homeVolunteerImageId", "Volunteer card", "Used in the Get involved section."],
  ["homePartnerImageId", "Partner card", "Used in the Get involved section."],
  ["homeDonateImageId", "Support card", "Used in the Get involved section."],
] as const;

const SECTION_IMAGE_FIELDS = [
  ["programsPageImageId", "Programs header", "The top image on the programmes listing page."],
  ["projectsPageImageId", "Projects header", "The top image on the projects listing page."],
  ["newsPageImageId", "News header", "The top image on the news listing page."],
  ["eventsPageImageId", "Events header", "The top image on the events listing page."],
  ["contactPageImageId", "Contact header", "The top image on the contact page."],
] as const;

export default async function Settings() {
  const actor = await guard("settings.manage");
  const s = await getSiteSettings();
  const images = await db
    .select()
    .from(mediaAssets)
    .where(and(isNull(mediaAssets.deletedAt), like(mediaAssets.mimeType, "image/%")))
    .orderBy(desc(mediaAssets.createdAt));

  return (
    <Shell actor={actor} active="/admin/settings" title="Settings">
      <Note title="Secrets are never stored here">
        Database, mail and storage credentials come from environment variables on the server. Nothing on this screen is
        a password or an API key.
      </Note>

      <SaveForm action={saveSiteSettings}>
        <div className="grid gap-5 lg:grid-cols-2 items-start">
          <div className="grid gap-5">
            <Panel title="Organisation">
              <Field id="orgName" label="Full name" required><input id="orgName" name="orgName" defaultValue={s.orgName} className="input" required /></Field>
              <Row2>
                <Field id="shortName" label="Short name" required><input id="shortName" name="shortName" defaultValue={s.shortName} className="input" required /></Field>
                <Field id="motto" label="Motto"><input id="motto" name="motto" defaultValue={s.motto} className="input" /></Field>
              </Row2>
              <Field id="strapline" label="Strapline"><input id="strapline" name="strapline" defaultValue={s.strapline} className="input" /></Field>
              <MediaPicker label="Organisation Logo" name="logoId" defaultValue={s.logoId} assets={images} />
              <p className="m-0 text-[0.76rem] text-[var(--color-ink-3)]">
                If no CMS logo is selected, the site uses the temporary logo from <code>/logo.png</code>.
              </p>
              <Row2>
                <Field id="registrationNo" label="Registration number"
                  hint="Displayed in the footer only if the box below is ticked.">
                  <input id="registrationNo" name="registrationNo" defaultValue={s.registrationNo ?? ""} className="input" />
                </Field>
                <Field label="Show it publicly">
                  <label className="flex gap-2.5 items-center text-[0.85rem] pt-2">
                    <input type="checkbox" name="showRegistrationNo" defaultChecked={s.showRegistrationNo} />
                    Show the registration number in the footer
                  </label>
                </Field>
              </Row2>
              <Field id="impactBandLabel" label="Impact band heading"
                hint="Switch to “Our Impact” once real achievement figures replace the targets.">
                <select id="impactBandLabel" name="impactBandLabel" className="input" defaultValue={s.impactBandLabel}>
                  <option>Our Five-Year Targets</option>
                  <option>Our Impact</option>
                </select>
              </Field>
            </Panel>

            <Panel title="Contact">
              <Field id="email" label="Public email address" required
                hint="Check the spelling carefully — the brochure shows “allianc”, not “alliance”.">
                <input id="email" name="email" type="email" defaultValue={s.email} className="input" required />
              </Field>
              <Field id="contactRecipient" label="Contact form recipient" required
                hint="Where messages are delivered. Not shown on the public site.">
                <input id="contactRecipient" name="contactRecipient" type="email" defaultValue={s.contactRecipient} className="input" required />
              </Field>
              <Row2>
                <Field id="phone1" label="Phone 1"><input id="phone1" name="phone1" defaultValue={s.phone1} className="input" /></Field>
                <Field id="phone2" label="Phone 2"><input id="phone2" name="phone2" defaultValue={s.phone2 ?? ""} className="input" /></Field>
              </Row2>
              <Field id="phone3" label="Phone 3"><input id="phone3" name="phone3" defaultValue={s.phone3 ?? ""} className="input" /></Field>
              <Field id="office" label="Principal office"><textarea id="office" name="office" rows={2} defaultValue={s.office} className="input" /></Field>
              <Row2>
                <Field id="registeredSeat" label="Registered seat"
                  hint="Article I of the bylaws names Monrovia; the operating address is above.">
                  <input id="registeredSeat" name="registeredSeat" defaultValue={s.registeredSeat} className="input" />
                </Field>
                <Field id="officeHours" label="Office hours"><input id="officeHours" name="officeHours" defaultValue={s.officeHours ?? ""} className="input" placeholder="Monday to Friday, 08:00–17:00" /></Field>
              </Row2>
            </Panel>
          </div>

          <div className="grid gap-5">
            <Panel title="Social">
              <p className="hint mb-3">Links are hidden on the public site while they are empty.</p>
              {([["facebookUrl", "Facebook"], ["twitterUrl", "X / Twitter"], ["instagramUrl", "Instagram"], ["linkedinUrl", "LinkedIn"], ["youtubeUrl", "YouTube"]] as const).map(([k, label]) => (
                <Field key={k} id={k} label={label}>
                  <input id={k} name={k} defaultValue={(s[k] as string | null) ?? ""} className="input" placeholder="https://" />
                </Field>
              ))}
            </Panel>

            <Panel title="Homepage Images">
              <p className="hint mb-4">
                These replace the temporary photos on the public homepage. Empty slots keep the current fallback image.
              </p>
              <div className="grid gap-4">
                {HOME_IMAGE_FIELDS.map(([name, label, hint]) => (
                  <div key={name}>
                    <MediaPicker label={label} name={name} defaultValue={s[name]} assets={images} />
                    <p className="m-0 mt-1.5 text-[0.73rem] text-[var(--color-ink-3)]">{hint}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Section Header Images">
              <p className="hint mb-4">
                These control the photo-backed headers on public listing and contact pages.
              </p>
              <div className="grid gap-4">
                {SECTION_IMAGE_FIELDS.map(([name, label, hint]) => (
                  <div key={name}>
                    <MediaPicker label={label} name={name} defaultValue={s[name]} assets={images} />
                    <p className="m-0 mt-1.5 text-[0.73rem] text-[var(--color-ink-3)]">{hint}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Search engines">
              <Field id="canonicalDomain" label="Canonical domain"
                hint="Rewrites every canonical URL, the sitemap and all sharing tags.">
                <input id="canonicalDomain" name="canonicalDomain" defaultValue={s.canonicalDomain} className="input" />
              </Field>
              <Field id="titleTemplate" label="Title template" hint="%s is replaced by the page title.">
                <input id="titleTemplate" name="titleTemplate" defaultValue={s.titleTemplate} className="input" />
              </Field>
              <Field id="defaultDescription" label="Default description">
                <textarea id="defaultDescription" name="defaultDescription" rows={3} defaultValue={s.defaultDescription} className="input" />
              </Field>
            </Panel>
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
