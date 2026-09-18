import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, programs, projects } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2 } from "@/components/admin/kit";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { SaveForm } from "@/components/admin/SaveForm";
import { availableTransitions, type Status } from "@/lib/workflow";
import { saveProject } from "../actions";

export const dynamic = "force-dynamic";

const COUNTIES = ["Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa", "Bomi", "Grand Cape Mount",
  "Gbarpolu", "Lofa", "Grand Gedeh", "Grand Kru", "Maryland", "River Cess", "River Gee", "Sinoe"];

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const actor = await guard("content.create");

  const p = isNew ? null : (await db.select().from(projects).where(eq(projects.id, id)).limit(1))[0] ?? null;
  if (!isNew && !p) notFound();

  const [progs, images] = await Promise.all([
    db.select().from(programs).where(isNull(programs.deletedAt)).orderBy(asc(programs.order)),
    db
      .select()
      .from(mediaAssets)
      .where(and(isNull(mediaAssets.deletedAt), like(mediaAssets.mimeType, "image/%")))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(40),
  ]);
  const status = (p?.status ?? "DRAFT") as Status;
  const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  return (
    <Shell actor={actor} active="/admin/projects" title={isNew ? "New project" : "Edit project"}>
      <div className="mb-4"><Link href="/admin/projects" className="text-[0.83rem] no-underline">&larr; All projects</Link></div>
      <SaveForm action={saveProject.bind(null, p?.id ?? null)}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_318px] items-start">
          <div>
            <Field id="title" label="Project name" required>
              <input id="title" name="title" defaultValue={p?.title ?? ""} className="input" required />
            </Field>
            <Field id="slug" label="Address"><input id="slug" name="slug" defaultValue={p?.slug ?? ""} className="input" /></Field>
            <Field id="summary" label="Description" required>
              <textarea id="summary" name="summary" rows={4} defaultValue={p?.summary ?? ""} className="input" required />
            </Field>
            <Field id="objectives" label="Objectives" hint="One per line.">
              <textarea id="objectives" name="objectives" rows={4} defaultValue={(p?.objectives ?? []).join("\n")} className="input" />
            </Field>
            <Row2>
              <Field id="county" label="County">
                <select id="county" name="county" className="input" defaultValue={p?.county ?? ""}>
                  <option value="">Not set</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field id="location" label="Place" hint="Community, street or landmark.">
                <input id="location" name="location" defaultValue={p?.location ?? ""} className="input" />
              </Field>
            </Row2>
            <Row2>
              <Field id="startDate" label="Start date">
                <input id="startDate" name="startDate" type="date" defaultValue={iso(p?.startDate)} className="input" />
              </Field>
              <Field id="endDate" label="End date">
                <input id="endDate" name="endDate" type="date" defaultValue={iso(p?.endDate)} className="input" />
              </Field>
            </Row2>
          </div>
          <div className="grid gap-4">
            <Panel title="Workflow">
              {p ? (
                <WorkflowBar resource="projects" id={p.id} status={status}
                  transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                  canDelete={actor.permissions.has("content.delete")} returnTo="/admin/projects" />
              ) : <p className="text-[0.82rem] text-[var(--color-ink-3)] m-0">Save first. It starts as a draft.</p>}
            </Panel>
            <Panel title="Classification">
              <Field id="programId" label="Programme">
                <select id="programId" name="programId" className="input" defaultValue={p?.programId ?? ""}>
                  <option value="">None</option>
                  {progs.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </Field>
              <Field id="projectStatus" label="Progress">
                <select id="projectStatus" name="projectStatus" className="input" defaultValue={p?.projectStatus ?? "PLANNED"}>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On hold</option>
                </select>
              </Field>
            </Panel>
            <Panel title="Project Image">
              <p className="hint mb-3">
                Used on project cards and this project page. If empty, the programme image is used.
              </p>
              <ImagePicker
                name="imageId"
                images={images.map((i) => ({ id: i.id, alt: i.altText, key: i.storageKey }))}
                selected={p?.imageId ?? null}
              />
            </Panel>
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
