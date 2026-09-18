"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { articleRevisions, pageRevisions, redirects } from "@/db/schema";
import { requireActionPermission } from "./auth";
import { ACTIONS, audit } from "./audit";
import { canTransition, type Status } from "./workflow";
import { buildPassages } from "./knowledge";
import { RESOURCES, type ResourceKey } from "./resources";
import { isLocalPath } from "./url";

/**
 * The uniform half of content management: status transitions, soft delete,
 * restore, and reindexing. Field-level saving lives with each module, because
 * the fields differ; everything below is identical for every content type and
 * is therefore written once.
 */

async function load(key: ResourceKey, id: string) {
  const d = RESOURCES[key];
  const [row] = await db.select().from(d.table).where(eq(d.table.id, id)).limit(1);
  return row as Record<string, unknown> | undefined;
}

/** Move a record through the editorial workflow. */
export async function transitionResource(key: ResourceKey, id: string, next: Status) {
  const d = RESOURCES[key];
  if (!d.hasStatus) throw new Error("This record has no workflow");

  const row = await load(key, id);
  if (!row) throw new Error("Not found");
  const current = row.status as Status;

  // Which permission is needed depends on the transition, not on the screen.
  const actor = await requireActionPermission(
    next === "IN_REVIEW" ? "content.submit" : next === "APPROVED" || (next === "DRAFT" && current === "IN_REVIEW") ? "content.review" : "content.publish",
  );
  if (!canTransition(current, next, actor)) throw new Error(`Cannot move from ${current} to ${next}`);

  const patch: Record<string, unknown> = { status: next };
  if (next === "PUBLISHED" && d.hasPublishedAt && !row.publishedAt) patch.publishedAt = new Date();

  await db.update(d.table).set(patch as never).where(eq(d.table.id, id));
  await audit(
    actor,
    next === "PUBLISHED" ? ACTIONS.contentPublish : ACTIONS.contentUpdate,
    `${key}:${id}`,
    `${current} → ${next}`,
  );

  // Publishing changes what the assistant knows, so the index is rebuilt.
  if (next === "PUBLISHED" || current === "PUBLISHED") await buildPassages();

  revalidatePath(d.adminPath);
  revalidatePath("/", "layout");
}

/** Soft delete: the row stays, the site stops showing it, and it can come back. */
export async function deleteResource(key: ResourceKey, id: string) {
  const actor = await requireActionPermission("content.delete");
  const d = RESOURCES[key];
  const row = await load(key, id);
  if (!row) throw new Error("Not found");

  if ("deletedAt" in d.table) {
    await db.update(d.table).set({ deletedAt: new Date() } as never).where(eq(d.table.id, id));
  } else {
    await db.delete(d.table).where(eq(d.table.id, id));
  }
  await audit(actor, ACTIONS.contentDelete, `${key}:${id}`, String(row.title ?? row.question ?? row.role ?? id));
  await buildPassages();
  revalidatePath(d.adminPath);
  revalidatePath("/", "layout");
}

export async function restoreResource(key: ResourceKey, id: string) {
  const actor = await requireActionPermission("content.purge");
  const d = RESOURCES[key];
  await db.update(d.table).set({ deletedAt: null } as never).where(eq(d.table.id, id));
  await audit(actor, ACTIONS.contentUpdate, `${key}:${id}`, "Restored");
  revalidatePath(d.adminPath);
}

/**
 * A published address must never break. When a slug changes, the old one is
 * kept as a permanent redirect (design review §13).
 */
export async function recordRedirect(from: string, to: string) {
  if (from === to) return;
  if (!isLocalPath(from) || !isLocalPath(to)) {
    throw new Error("A redirect must point at a path on this site.");
  }
  await db.insert(redirects).values({ from, to, code: 301 }).onConflictDoUpdate({
    target: redirects.from,
    set: { to },
  });
  // If the new address was itself a redirect target, drop that stale hop.
  await db.delete(redirects).where(eq(redirects.from, to));
}

export async function reindexKnowledge() {
  const actor = await requireActionPermission("knowledge.edit");
  const r = await buildPassages();
  await audit(actor, ACTIONS.knowledgeReindex, "knowledge", `${r.sources} sources, ${r.passages} passages`);
  revalidatePath("/admin/chat/knowledge");
  return r;
}

/**
 * Insert a revision, numbering it in the same statement.
 *
 * The previous nextVersion() read `max(version) + 1` and the caller inserted
 * with that value afterwards, against a UNIQUE index on (page_id, version). Two
 * editors saving the same page at once both read the same maximum and the second
 * save failed with a unique violation — losing that editor's work on the feature
 * whose whole purpose is to make editing safe.
 *
 * The subquery runs inside the insert, so the read and the write are one
 * statement, and a genuine collision retries once rather than surfacing.
 *
 * It also removes the last sql.raw() identifier interpolation in the codebase:
 * the table and column were previously concatenated into the query text.
 */
export async function saveRevision(
  kind: "page" | "article",
  parentId: string,
  data: { title: string; body: string; authorId: string },
) {
  const insert = async () => {
    if (kind === "page") {
      await db.insert(pageRevisions).values({
        pageId: parentId,
        version: sql`(select coalesce(max(version), 0) + 1 from page_revisions where page_id = ${parentId})`,
        title: data.title,
        body: data.body,
        authorId: data.authorId,
      });
    } else {
      await db.insert(articleRevisions).values({
        articleId: parentId,
        version: sql`(select coalesce(max(version), 0) + 1 from article_revisions where article_id = ${parentId})`,
        title: data.title,
        body: data.body,
        authorId: data.authorId,
      });
    }
  };

  try {
    await insert();
  } catch (err) {
    // 23505: two saves landed in the same instant. One retry settles it.
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "23505") {
      await insert();
    } else {
      throw err;
    }
  }
}
