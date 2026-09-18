import { and, asc, desc, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { contentBlocks, mediaAssets } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2, Mono, Note } from "@/components/admin/kit";
import { RichText } from "@/components/admin/RichText";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SaveForm } from "@/components/admin/SaveForm";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { availableTransitions, type Status } from "@/lib/workflow";
import { saveContentBlock } from "./actions";

export const dynamic = "force-dynamic";

function pageLabel(page: string) {
  return page === "home" ? "Homepage" : `/${page}`;
}

export default async function ContentBlocksAdmin() {
  const actor = await guard("content.create");
  const [rows, images] = await Promise.all([
    db.select().from(contentBlocks).where(isNull(contentBlocks.deletedAt)).orderBy(asc(contentBlocks.page), asc(contentBlocks.order)),
    db
      .select()
      .from(mediaAssets)
      .where(and(isNull(mediaAssets.deletedAt), like(mediaAssets.mimeType, "image/%")))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(80),
  ]);

  return (
    <Shell actor={actor} active="/admin/content-blocks" title="Content blocks">
      <Note title="Blocks power page sections">
        Homepage sections and reusable public copy live here. Full public URLs still live under Pages.
      </Note>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="grid gap-4">
          {rows.map((block) => {
            const status = block.status as Status;
            return (
              <Panel
                key={block.id}
                title={block.label}
                actions={<Mono>{pageLabel(block.page)} / {block.slot}</Mono>}
              >
                <SaveForm action={saveContentBlock.bind(null, block.id)}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
                    <div>
                      <Row2>
                        <Field id={`page-${block.id}`} label="Page" required>
                          <input id={`page-${block.id}`} name="page" defaultValue={block.page} className="input" required />
                        </Field>
                        <Field id={`slot-${block.id}`} label="Slot" required>
                          <input id={`slot-${block.id}`} name="slot" defaultValue={block.slot} className="input" required />
                        </Field>
                      </Row2>
                      <Row2>
                        <Field id={`label-${block.id}`} label="Admin label" required>
                          <input id={`label-${block.id}`} name="label" defaultValue={block.label} className="input" required />
                        </Field>
                        <Field id={`order-${block.id}`} label="Order">
                          <input id={`order-${block.id}`} name="order" type="number" min={0} max={999} defaultValue={block.order} className="input" />
                        </Field>
                      </Row2>
                      <Field id={`eyebrow-${block.id}`} label="Eyebrow">
                        <input id={`eyebrow-${block.id}`} name="eyebrow" defaultValue={block.eyebrow ?? ""} className="input" />
                      </Field>
                      <Field id={`title-${block.id}`} label="Title" required>
                        <input id={`title-${block.id}`} name="title" defaultValue={block.title} className="input" required />
                      </Field>
                      <Field label="Body">
                        <RichText name="body" defaultValue={block.body} />
                      </Field>
                    </div>
                    <div className="grid gap-4">
                      <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
                        <h3 className="font-sans text-[0.86rem] font-bold mb-3">Workflow</h3>
                        <WorkflowBar
                          resource="contentBlocks"
                          id={block.id}
                          status={status}
                          transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                          canDelete={actor.permissions.has("content.delete")}
                          returnTo="/admin/content-blocks"
                        />
                      </div>
                      <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
                        <h3 className="font-sans text-[0.86rem] font-bold mb-3">CTA</h3>
                        <Field id={`ctaLabel-${block.id}`} label="Label">
                          <input id={`ctaLabel-${block.id}`} name="ctaLabel" defaultValue={block.ctaLabel ?? ""} className="input" />
                        </Field>
                        <Field id={`ctaHref-${block.id}`} label="Link">
                          <input id={`ctaHref-${block.id}`} name="ctaHref" defaultValue={block.ctaHref ?? ""} className="input" placeholder="/contact" />
                        </Field>
                      </div>
                      <MediaPicker label="Block image" name="imageId" defaultValue={block.imageId} assets={images} />
                    </div>
                  </div>
                </SaveForm>
              </Panel>
            );
          })}
        </div>

        <Panel title="Add block">
          <SaveForm action={saveContentBlock.bind(null, null)} label="Add block">
            <Field id="new-page" label="Page" required>
              <input id="new-page" name="page" defaultValue="home" className="input" required />
            </Field>
            <Field id="new-slot" label="Slot" required>
              <input id="new-slot" name="slot" placeholder="section-name" className="input" required />
            </Field>
            <Field id="new-label" label="Admin label" required>
              <input id="new-label" name="label" placeholder="Homepage intro" className="input" required />
            </Field>
            <Field id="new-title" label="Title" required>
              <input id="new-title" name="title" className="input" required />
            </Field>
            <Field label="Body">
              <RichText name="body" />
            </Field>
            <Row2>
              <Field id="new-eyebrow" label="Eyebrow">
                <input id="new-eyebrow" name="eyebrow" className="input" />
              </Field>
              <Field id="new-order" label="Order">
                <input id="new-order" name="order" type="number" min={0} max={999} defaultValue={rows.length} className="input" />
              </Field>
            </Row2>
            <Field id="new-cta-label" label="CTA label">
              <input id="new-cta-label" name="ctaLabel" className="input" />
            </Field>
            <Field id="new-cta-href" label="CTA link">
              <input id="new-cta-href" name="ctaHref" className="input" />
            </Field>
            <MediaPicker label="Block image" name="imageId" assets={images} />
          </SaveForm>
        </Panel>
      </div>
    </Shell>
  );
}
