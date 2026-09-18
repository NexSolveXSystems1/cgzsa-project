"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { articles, contentBlocks, events, mediaAssets, pages, partners, programs, projects, publications, seoMeta, siteSettings, teamMembers } from "@/db/schema";
import { requireActionPermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { remove } from "@/lib/storage";

/**
 * Removing media, properly.
 *
 * The media library had no delete action at all, and `storage.remove()` — which
 * deletes the file from disk — was exported and called by nothing. Two
 * consequences: the storage volume grew without bound on a disk nobody watches,
 * and a photograph deleted at its subject's request stayed on disk, which is a
 * data-protection problem as well as a housekeeping one.
 *
 * Deletion is two stages on purpose. Soft delete hides the asset immediately and
 * is reversible, because an editor removing the wrong photograph should not be a
 * disaster. Purge removes the row and the file for good, needs the higher
 * `content.purge` permission, and refuses while anything still points at the
 * asset — a purge that leaves a broken image on a published page is worse than
 * one that stops and says what is using it.
 */

const RETENTION_DAYS = 30;

/** Everything that can point at a media asset, so a purge cannot orphan a page. */
async function referencesTo(assetId: string) {
  const [inPages, inBlocks, inArticles, inPrograms, inProjects, inEvents, inPublications, inTeam, inSeo, inPartners, inSiteSettings] = await Promise.all([
    db.select({ id: pages.id, title: pages.title }).from(pages).where(eq(pages.imageId, assetId)),
    db.select({ id: contentBlocks.id, title: contentBlocks.label }).from(contentBlocks).where(eq(contentBlocks.imageId, assetId)),
    db.select({ id: articles.id, title: articles.title }).from(articles).where(eq(articles.imageId, assetId)),
    db.select({ id: programs.id, title: programs.title }).from(programs).where(eq(programs.imageId, assetId)),
    db.select({ id: projects.id, title: projects.title }).from(projects).where(eq(projects.imageId, assetId)),
    db.select({ id: events.id, title: events.title }).from(events).where(eq(events.imageId, assetId)),
    db.select({ id: publications.id, title: publications.title }).from(publications).where(eq(publications.fileId, assetId)),
    db.select({ id: teamMembers.id, title: teamMembers.role }).from(teamMembers).where(eq(teamMembers.photoId, assetId)),
    db.select({ id: seoMeta.id, title: seoMeta.title }).from(seoMeta).where(eq(seoMeta.ogImageId, assetId)),
    db.select({ id: partners.id, title: partners.name }).from(partners).where(eq(partners.logoId, assetId)),
    db.select({ id: siteSettings.id }).from(siteSettings).where(or(
      eq(siteSettings.logoId, assetId),
      eq(siteSettings.homeHeroImageId, assetId),
      eq(siteSettings.homeIntroImageId, assetId),
      eq(siteSettings.homeWasteImageId, assetId),
      eq(siteSettings.homePublicSpaceImageId, assetId),
      eq(siteSettings.homeWaterImageId, assetId),
      eq(siteSettings.homeVolunteerImageId, assetId),
      eq(siteSettings.homePartnerImageId, assetId),
      eq(siteSettings.homeDonateImageId, assetId),
      eq(siteSettings.programsPageImageId, assetId),
      eq(siteSettings.projectsPageImageId, assetId),
      eq(siteSettings.newsPageImageId, assetId),
      eq(siteSettings.eventsPageImageId, assetId),
      eq(siteSettings.contactPageImageId, assetId),
    )),
  ]);
  return [
    ...inPages.map((r) => `page "${r.title}"`),
    ...inBlocks.map((r) => `content block "${r.title}"`),
    ...inArticles.map((r) => `article "${r.title}"`),
    ...inPrograms.map((r) => `programme "${r.title}"`),
    ...inProjects.map((r) => `project "${r.title}"`),
    ...inEvents.map((r) => `event "${r.title}"`),
    ...inPublications.map((r) => `publication "${r.title}"`),
    ...inTeam.map((r) => `team member "${r.title}"`),
    ...inSeo.map(() => "a page's social share image"),
    ...inPartners.map((r) => `partner "${r.title}"`),
    ...inSiteSettings.map(() => "site settings"),
  ];
}

/** Hide it from the site. Reversible, and the file stays on disk for now. */
export async function softDeleteAsset(assetId: string) {
  const actor = await requireActionPermission("content.delete");

  const used = await referencesTo(assetId);
  if (used.length) {
    return { error: `Still in use by ${used.slice(0, 3).join(", ")}${used.length > 3 ? ` and ${used.length - 3} more` : ""}. Remove it there first.` };
  }

  await db.update(mediaAssets).set({ deletedAt: new Date() }).where(eq(mediaAssets.id, assetId));
  await audit(actor, "media.delete", `media:${assetId}`, "Removed from the library");
  revalidatePath("/admin/media");
  return { ok: true };
}

export async function restoreAsset(assetId: string) {
  const actor = await requireActionPermission("content.delete");
  await db.update(mediaAssets).set({ deletedAt: null }).where(eq(mediaAssets.id, assetId));
  await audit(actor, "media.restore", `media:${assetId}`, "Restored to the library");
  revalidatePath("/admin/media");
  return { ok: true };
}

/** Remove the row and the file. Not reversible. */
export async function purgeAsset(assetId: string) {
  const actor = await requireActionPermission("content.purge");

  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
  if (!asset) return { error: "That file no longer exists." };

  const used = await referencesTo(assetId);
  if (used.length) {
    return { error: `Still in use by ${used.slice(0, 3).join(", ")}. Remove it there first.` };
  }

  // Row first, then file. If the unlink fails the row is already gone and the
  // sweep below will not find it again — so an orphaned file is possible, which
  // is a wasted byte rather than a broken page. The other order risks a row
  // pointing at a file that is no longer there, which renders as a broken image.
  await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
  await remove(asset.storageKey);

  await audit(actor, "media.purge", `media:${assetId}`, `${asset.originalName} · file removed from storage`);
  revalidatePath("/admin/media");
  return { ok: true };
}

/**
 * Purge assets soft-deleted more than thirty days ago. Called by the scheduled
 * job, so storage does not grow forever without anybody having to remember.
 */
export async function purgeExpiredAssets(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const stale = await db
    .select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(and(isNotNull(mediaAssets.deletedAt), lt(mediaAssets.deletedAt, cutoff)));

  let purged = 0;
  for (const asset of stale) {
    if ((await referencesTo(asset.id)).length) continue; // something started using it again
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
    await remove(asset.storageKey);
    purged++;
  }
  return purged;
}
