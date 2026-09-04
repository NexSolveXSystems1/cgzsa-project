import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pageRevisions, pages, users } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2 } from "@/components/admin/kit";
import { RichText } from "@/components/admin/RichText";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { SaveForm } from "@/components/admin/SaveForm";
import { RevisionList } from "@/components/admin/RevisionList";
import { availableTransitions, type Status } from "@/lib/workflow";
import { savePage } from "../actions";
import { formatDate } from "@/lib/format";

import { seoOverrides } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const actor = await guard("content.create");

  const page = isNew
    ? null
    : (await db.select().from(pages).where(eq(pages.id, id)).limit(1))[0] ?? null;
  if (!isNew && !page) notFound();

  const seo = page ? await seoOverrides("page", page.id) : null;

  const revisions = page
    ? await db
        .select({
          id: pageRevisions.id,
          version: pageRevisions.version,
          createdAt: pageRevisions.createdAt,
          author: users.name,
        })
        .from(pageRevisions)
        .leftJoin(users, eq(users.id, pageRevisions.authorId))
        .where(eq(pageRevisions.pageId, page.id))
        .orderBy(desc(pageRevisions.version))
        .limit(8)
    : [];

  const status = (page?.status ?? "DRAFT") as Status;

  return (
    <Shell
      actor={actor}
      active="/admin/pages"
      title={isNew ? "New page" : "Edit page"}
      actions={
        page ? (
          <Link href={`/${page.slug}`} target="_blank" className="btn btn-ghost btn-sm">
            View on the site
          </Link>
        ) : null
      }
    >
      <div className="mb-4">
        <Link href="/admin/pages" className="text-[0.83rem] no-underline">&larr; All pages</Link>
      </div>

      <SaveForm action={savePage.bind(null, page?.id ?? null)}>
        <div className="grid gap-4.5 gap-5 lg:grid-cols-[minmax(0,1fr)_318px] items-start">
          <div>
            <Field id="title" label="Title" required>
              <input id="title" name="title" defaultValue={page?.title ?? ""} className="input" required />
            </Field>
            <Row2>
              <Field
                id="slug"
                label="Address"
                hint={page ? <>Public address: <span className="font-mono">/{page.slug}</span>. Changing this creates a permanent redirect from the old one.</> : "Left blank, this is made from the title."}
              >
                <input id="slug" name="slug" defaultValue={page?.slug ?? ""} className="input" />
              </Field>
              <Field id="section" label="Section" hint="Groups the page in the site navigation.">
                <input id="section" name="section" defaultValue={page?.section ?? ""} className="input" />
              </Field>
            </Row2>
            <Field id="excerpt" label="Summary" hint="Shown on cards, in search results, and as the default meta description.">
              <textarea id="excerpt" name="excerpt" rows={2} defaultValue={page?.excerpt ?? ""} className="input" />
            </Field>
            <Field label="Body">
              <RichText name="body" defaultValue={page?.body ?? ""} />
            </Field>
          </div>

          <div className="grid gap-4">
            <Panel title="Workflow">
              {page ? (
                <WorkflowBar
                  resource="pages"
                  id={page.id}
                  status={status}
                  transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                  canDelete={actor.permissions.has("content.delete")}
                  returnTo="/admin/pages"
                />
              ) : (
                <p className="text-[0.82rem] text-[var(--color-ink-3)] m-0">
                  Save the page first. It starts as a draft.
                </p>
              )}
            </Panel>

            <Panel title="SEO & Sharing Overrides">
              <Field id="seoTitle" label="Custom Meta Title" hint="Overrides default title format if specified.">
                <input id="seoTitle" name="seoTitle" defaultValue={seo?.title ?? ""} className="input" placeholder="Custom page title" />
              </Field>
              <Field id="seoDescription" label="Custom Meta Description">
                <textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={seo?.description ?? ""} className="input" placeholder="Custom description for search engines" />
              </Field>
              <Field id="seoCanonical" label="Canonical URL Override">
                <input id="seoCanonical" name="seoCanonical" defaultValue={seo?.canonical ?? ""} className="input" placeholder="https://..." />
              </Field>
              <Field label="Robots Directives">
                <label className="flex gap-2 items-center text-[0.85rem] pt-1">
                  <input type="checkbox" name="seoNoindex" defaultChecked={seo?.noindex ?? false} />
                  Hide this page from search engines (noindex)
                </label>
              </Field>
            </Panel>

            {page && (
              <Panel title="Details">
                <div className="grid gap-2 text-[0.82rem]">
                  <div className="flex justify-between border-b border-[var(--color-line)] pb-1.5">
                    <span>Created</span><span className="text-[var(--color-ink-2)]">{formatDate(page.createdAt)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-line)] pb-1.5">
                    <span>Last updated</span><span className="text-[var(--color-ink-2)]">{formatDate(page.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Published</span><span className="text-[var(--color-ink-2)]">{formatDate(page.publishedAt) || "Not yet"}</span>
                  </div>
                </div>
              </Panel>
            )}

            {page && revisions.length > 0 && (
              <Panel title="Revisions">
                <RevisionList pageId={page.id} revisions={revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
              </Panel>
            )}
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
