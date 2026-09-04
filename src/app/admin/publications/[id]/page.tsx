import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, publicationCategories, publications } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2 } from "@/components/admin/kit";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { SaveForm } from "@/components/admin/SaveForm";
import { Uploader } from "@/components/admin/Uploader";
import { availableTransitions, type Status } from "@/lib/workflow";
import { savePublication } from "../actions";
import { humanBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function EditPublication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const actor = await guard("content.create");

  const p = isNew ? null : (await db.select().from(publications).where(eq(publications.id, id)).limit(1))[0] ?? null;
  if (!isNew && !p) notFound();

  const [cats, files, current] = await Promise.all([
    db.select().from(publicationCategories).orderBy(asc(publicationCategories.name)),
    db.select().from(mediaAssets).where(eq(mediaAssets.mimeType, "application/pdf")).orderBy(desc(mediaAssets.createdAt)).limit(40),
    p?.categoryId ? db.select().from(publicationCategories).where(eq(publicationCategories.id, p.categoryId)).limit(1) : Promise.resolve([]),
  ]);

  const status = (p?.status ?? "DRAFT") as Status;

  return (
    <Shell actor={actor} active="/admin/publications" title={isNew ? "Add publication" : "Edit publication"}>
      <div className="mb-4"><Link href="/admin/publications" className="text-[0.83rem] no-underline">&larr; All publications</Link></div>
      <SaveForm action={savePublication.bind(null, p?.id ?? null)}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_318px] items-start">
          <div>
            <Field id="title" label="Title" required>
              <input id="title" name="title" defaultValue={p?.title ?? ""} className="input" required />
            </Field>
            <Field id="slug" label="Address"><input id="slug" name="slug" defaultValue={p?.slug ?? ""} className="input" /></Field>
            <Field id="description" label="Description">
              <textarea id="description" name="description" rows={4} defaultValue={p?.description ?? ""} className="input" />
            </Field>
            <Row2>
              <Field id="categoryName" label="Category" hint="Typed here, created if it does not exist.">
                <input id="categoryName" name="categoryName" list="pubcats" defaultValue={current[0]?.name ?? ""} className="input" />
                <datalist id="pubcats">{cats.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </Field>
              <Field id="publishedOn" label="Publication date">
                <input id="publishedOn" name="publishedOn" type="date" className="input"
                  defaultValue={p?.publishedOn ? new Date(p.publishedOn).toISOString().slice(0, 10) : ""} />
              </Field>
            </Row2>
            <Field id="fileId" label="File">
              <select id="fileId" name="fileId" className="input" defaultValue={p?.fileId ?? ""}>
                <option value="">No file attached</option>
                {files.map((f) => <option key={f.id} value={f.id}>{f.originalName} · {humanBytes(f.bytes)}</option>)}
              </select>
            </Field>
            <label className="flex gap-2.5 items-center text-[0.85rem] mb-4">
              <input type="checkbox" name="allowDownload" defaultChecked={p?.allowDownload ?? true} />
              Visitors may download this document, not only read it
            </label>
          </div>
          <div className="grid gap-4">
            <Panel title="Workflow">
              {p ? (
                <WorkflowBar resource="publications" id={p.id} status={status}
                  transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                  canDelete={actor.permissions.has("content.delete")} returnTo="/admin/publications" />
              ) : <p className="text-[0.82rem] text-[var(--color-ink-3)] m-0">Save first. It starts as a draft.</p>}
            </Panel>
            <Panel title="Upload a PDF"><Uploader accept="application/pdf" /></Panel>
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
