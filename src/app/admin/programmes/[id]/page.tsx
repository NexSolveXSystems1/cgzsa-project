import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, programs } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2 } from "@/components/admin/kit";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { SaveForm } from "@/components/admin/SaveForm";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { availableTransitions, type Status } from "@/lib/workflow";
import { saveProgramme } from "../actions";

export const dynamic = "force-dynamic";

const ICONS = [["waste", "Waste"], ["water", "Water"], ["park", "Park"], ["bench", "Bench"], ["flood", "Flood"]];

export default async function EditProgramme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const actor = await guard("content.create");

  const p = isNew ? null : (await db.select().from(programs).where(eq(programs.id, id)).limit(1))[0] ?? null;
  if (!isNew && !p) notFound();

  const images = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(40);
  const status = (p?.status ?? "DRAFT") as Status;

  return (
    <Shell actor={actor} active="/admin/programmes" title={isNew ? "New programme" : "Edit programme"}
      actions={p ? <Link href={`/programs/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm">View on the site</Link> : null}>
      <div className="mb-4"><Link href="/admin/programmes" className="text-[0.83rem] no-underline">&larr; All programmes</Link></div>

      <SaveForm action={saveProgramme.bind(null, p?.id ?? null)}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_318px] items-start">
          <div>
            <Row2>
              <Field id="title" label="Title" required>
                <input id="title" name="title" defaultValue={p?.title ?? ""} className="input" required />
              </Field>
              <Field id="tagline" label="Tagline" hint="A short label, shown on the programme card.">
                <input id="tagline" name="tagline" defaultValue={p?.tagline ?? ""} className="input" />
              </Field>
            </Row2>
            <Row2>
              <Field id="slug" label="Address" hint="Changing it creates a permanent redirect.">
                <input id="slug" name="slug" defaultValue={p?.slug ?? ""} className="input" />
              </Field>
              <Field id="order" label="Order" hint="Lower numbers appear first.">
                <input id="order" name="order" type="number" min={0} max={99} defaultValue={p?.order ?? 0} className="input" />
              </Field>
            </Row2>
            <Field id="lead" label="Opening paragraph" required>
              <textarea id="lead" name="lead" rows={3} defaultValue={p?.lead ?? ""} className="input" required />
            </Field>
            <Field id="activities" label="What we do" hint="One activity per line.">
              <textarea id="activities" name="activities" rows={4} defaultValue={(p?.activities ?? []).join("\n")} className="input" />
            </Field>
            <Field id="rationale" label="Why this programme exists" hint="One paragraph per line.">
              <textarea id="rationale" name="rationale" rows={5} defaultValue={(p?.rationale ?? []).join("\n")} className="input" />
            </Field>
            <Field id="response" label="Our founding response">
              <textarea id="response" name="response" rows={3} defaultValue={p?.response ?? ""} className="input" />
            </Field>
          </div>

          <div className="grid gap-4">
            <Panel title="Workflow">
              {p ? (
                <WorkflowBar resource="programmes" id={p.id} status={status}
                  transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                  canDelete={actor.permissions.has("content.delete")} returnTo="/admin/programmes" />
              ) : <p className="text-[0.82rem] text-[var(--color-ink-3)] m-0">Save first. It starts as a draft.</p>}
            </Panel>
            <Panel title="Icon">
              <Field id="icon" label="Programme icon">
                <select id="icon" name="icon" className="input" defaultValue={p?.icon ?? "waste"}>
                  {ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </Panel>
            <Panel title="Photograph">
              <ImagePicker name="imageId" images={images.map((i) => ({ id: i.id, alt: i.altText, key: i.storageKey }))} selected={p?.imageId ?? null} />
            </Panel>
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
