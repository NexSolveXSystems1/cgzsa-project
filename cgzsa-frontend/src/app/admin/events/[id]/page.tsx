import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events, mediaAssets } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2 } from "@/components/admin/kit";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { SaveForm } from "@/components/admin/SaveForm";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { availableTransitions, type Status } from "@/lib/workflow";
import { saveEvent } from "../actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const actor = await guard("content.create");

  const e = isNew ? null : (await db.select().from(events).where(eq(events.id, id)).limit(1))[0] ?? null;
  if (!isNew && !e) notFound();

  const [images, regs] = await Promise.all([
    db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(40),
    e ? db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, e.id)).orderBy(desc(eventRegistrations.createdAt)) : Promise.resolve([]),
  ]);

  const status = (e?.status ?? "DRAFT") as Status;
  const dt = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 16) : "");

  return (
    <Shell actor={actor} active="/admin/events" title={isNew ? "New event" : "Edit event"}>
      <div className="mb-4"><Link href="/admin/events" className="text-[0.83rem] no-underline">&larr; All events</Link></div>
      <SaveForm action={saveEvent.bind(null, e?.id ?? null)}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_318px] items-start">
          <div>
            <Field id="title" label="Title" required>
              <input id="title" name="title" defaultValue={e?.title ?? ""} className="input" required />
            </Field>
            <Field id="slug" label="Address"><input id="slug" name="slug" defaultValue={e?.slug ?? ""} className="input" /></Field>
            <Field id="summary" label="Description" required>
              <textarea id="summary" name="summary" rows={4} defaultValue={e?.summary ?? ""} className="input" required />
            </Field>
            <Row2>
              <Field id="startsAt" label="Starts" required>
                <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={dt(e?.startsAt)} className="input" required />
              </Field>
              <Field id="endsAt" label="Ends">
                <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={dt(e?.endsAt)} className="input" />
              </Field>
            </Row2>
            <Row2>
              <Field id="location" label="Location" required>
                <input id="location" name="location" defaultValue={e?.location ?? ""} className="input" required />
              </Field>
              <Field id="county" label="County">
                <input id="county" name="county" defaultValue={e?.county ?? ""} className="input" />
              </Field>
            </Row2>
            <Field id="registerUrl" label="Registration link" hint="Optional. Must start with http:// or https://">
              <input id="registerUrl" name="registerUrl" defaultValue={e?.registerUrl ?? ""} className="input" />
            </Field>

            {regs.length > 0 && (
              <Panel title={`${regs.length} registration${regs.length === 1 ? "" : "s"}`} className="mt-5">
                {regs.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3 py-1.5 border-b border-[var(--color-line)] last:border-0 text-[0.83rem]">
                    <span>{r.name}</span>
                    <span className="text-[var(--color-ink-3)]">{r.email}</span>
                    <span className="font-mono text-[0.74rem] text-[var(--color-ink-3)]">{formatDate(r.createdAt)}</span>
                  </div>
                ))}
              </Panel>
            )}
          </div>
          <div className="grid gap-4">
            <Panel title="Workflow">
              {e ? (
                <WorkflowBar resource="events" id={e.id} status={status}
                  transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                  canDelete={actor.permissions.has("content.delete")} returnTo="/admin/events" />
              ) : <p className="text-[0.82rem] text-[var(--color-ink-3)] m-0">Save first. It starts as a draft.</p>}
            </Panel>
            <Panel title="Featured image">
              <ImagePicker name="imageId" images={images.map((i) => ({ id: i.id, alt: i.altText, key: i.storageKey }))} selected={e?.imageId ?? null} />
            </Panel>
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
