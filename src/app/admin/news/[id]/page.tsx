import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleRevisions, articleTags, articles, categories, mediaAssets, tags, users } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field } from "@/components/admin/kit";
import { RichText } from "@/components/admin/RichText";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { SaveForm } from "@/components/admin/SaveForm";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { RevisionList } from "@/components/admin/RevisionList";
import { availableTransitions, type Status } from "@/lib/workflow";
import { saveArticle } from "../actions";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const actor = await guard("content.create");

  const article = isNew ? null : (await db.select().from(articles).where(eq(articles.id, id)).limit(1))[0] ?? null;
  if (!isNew && !article) notFound();

  const [cats, images, settings] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(mediaAssets).where(eq(mediaAssets.mimeType, "image/webp")).orderBy(desc(mediaAssets.createdAt)).limit(40),
    getSiteSettings(),
  ]);

  // Version history, newest first, with who saved each one.
  const revisions = article
    ? await db
        .select({
          id: articleRevisions.id,
          version: articleRevisions.version,
          createdAt: articleRevisions.createdAt,
          author: users.name,
        })
        .from(articleRevisions)
        .leftJoin(users, eq(users.id, articleRevisions.authorId))
        .where(eq(articleRevisions.articleId, article.id))
        .orderBy(desc(articleRevisions.version))
        .limit(20)
    : [];

  const currentTags = article
    ? (await db.select({ name: tags.name }).from(articleTags)
        .innerJoin(tags, eq(tags.id, articleTags.tagId))
        .where(eq(articleTags.articleId, article.id))).map((t) => t.name).join(", ")
    : "";

  const status = (article?.status ?? "DRAFT") as Status;
  const slug = article?.slug ?? "new-article";

  return (
    <Shell
      actor={actor}
      active="/admin/news"
      title={isNew ? "New article" : "Edit article"}
      actions={article && article.status === "PUBLISHED" ? (
        <Link href={`/news/${article.slug}`} target="_blank" className="btn btn-ghost btn-sm">View on the site</Link>
      ) : null}
    >
      <div className="mb-4"><Link href="/admin/news" className="text-[0.83rem] no-underline">&larr; All news</Link></div>

      <SaveForm action={saveArticle.bind(null, article?.id ?? null)}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_318px] items-start">
          <div>
            <Field id="title" label="Title" required>
              <input id="title" name="title" defaultValue={article?.title ?? ""} className="input" required />
            </Field>
            <Field id="slug" label="Address"
              hint={<>Public address: <span className="font-mono">/news/{slug}</span>. Changing it creates a permanent redirect from the old one.</>}>
              <input id="slug" name="slug" defaultValue={article?.slug ?? ""} className="input" />
            </Field>
            <Field id="excerpt" label="Summary" required
              hint="Used on cards, in search results and as the default meta description. Aim for under 160 characters.">
              <textarea id="excerpt" name="excerpt" rows={2} defaultValue={article?.excerpt ?? ""} className="input" required />
            </Field>
            <Field label="Body">
              <RichText name="body" defaultValue={article?.body ?? ""} />
            </Field>

            <Panel title="Search engine preview" className="mt-5">
              <div className="font-mono text-[0.78rem] text-[var(--color-ink-3)] mb-1">
                {settings.canonicalDomain} › news › {slug}
              </div>
              <div className="text-[1.05rem] mb-1" style={{ color: "#1a4fbb" }}>
                {article?.title || "Article title"} | {settings.shortName}
              </div>
              <div className="text-[0.85rem] text-[var(--color-ink-2)]">
                {article?.excerpt || "The summary appears here."}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4">
            <Panel title="Workflow">
              {article ? (
                <WorkflowBar
                  resource="news"
                  id={article.id}
                  status={status}
                  transitions={availableTransitions(status, actor).map((t) => ({ to: t.to, label: t.label }))}
                  canDelete={actor.permissions.has("content.delete")}
                  returnTo="/admin/news"
                />
              ) : (
                <p className="text-[0.82rem] text-[var(--color-ink-3)] m-0">Save the article first. It starts as a draft.</p>
              )}
            </Panel>

            <Panel title="Publishing">
              <Field id="publishAt" label="Publish at"
                hint="Leave blank to publish immediately when approved. A future date holds it until then.">
                <input
                  id="publishAt" name="publishAt" type="datetime-local" className="input"
                  defaultValue={article?.publishAt ? new Date(article.publishAt).toISOString().slice(0, 16) : ""}
                />
              </Field>
            </Panel>

            <Panel title="Featured image">
              <ImagePicker name="imageId" images={images.map((i) => ({ id: i.id, alt: i.altText, key: i.storageKey }))} selected={article?.imageId ?? null} />
            </Panel>

            <Panel title="Taxonomy">
              <Field id="categoryId" label="Category">
                <select id="categoryId" name="categoryId" className="input" defaultValue={article?.categoryId ?? ""}>
                  <option value="">None</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field id="tags" label="Tags" hint="Comma separated. New tags are created as you use them.">
                <input id="tags" name="tags" defaultValue={currentTags} className="input" />
              </Field>
            </Panel>

            {article && revisions.length > 0 && (
              <Panel title="History" className="mt-5">
                <RevisionList
                  kind="article"
                  pageId={article.id}
                  revisions={revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
                />
              </Panel>
            )}
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
