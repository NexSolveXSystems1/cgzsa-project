import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contentBlocks, mediaAssets } from "@/db/schema";
import { cmsBodyHtml } from "./CmsPage";
import { htmlToText } from "@/lib/sanitise";
import { mediaStoryImage, type StoryImage } from "./storyImages";

export type PublicContentBlock = Awaited<ReturnType<typeof getPublishedContentBlocks>>[number];

export async function getPublishedContentBlocks(page: string, slots: string[]) {
  if (!slots.length) return [];

  return db
    .select({
      id: contentBlocks.id,
      page: contentBlocks.page,
      slot: contentBlocks.slot,
      label: contentBlocks.label,
      eyebrow: contentBlocks.eyebrow,
      title: contentBlocks.title,
      body: contentBlocks.body,
      ctaLabel: contentBlocks.ctaLabel,
      ctaHref: contentBlocks.ctaHref,
      order: contentBlocks.order,
      imageKey: mediaAssets.storageKey,
      imageAlt: mediaAssets.altText,
    })
    .from(contentBlocks)
    .leftJoin(mediaAssets, eq(mediaAssets.id, contentBlocks.imageId))
    .where(and(
      eq(contentBlocks.page, page),
      inArray(contentBlocks.slot, slots),
      eq(contentBlocks.status, "PUBLISHED"),
      isNull(contentBlocks.deletedAt),
    ))
    .orderBy(asc(contentBlocks.order));
}

export function blockMap(blocks: PublicContentBlock[]) {
  return new Map(blocks.map((block) => [block.slot, block]));
}

export function blockImage(block: PublicContentBlock | undefined, fallback: StoryImage) {
  return mediaStoryImage(block?.imageKey, block?.imageAlt, fallback);
}

export function blockText(
  block: PublicContentBlock | undefined,
  fallback: { eyebrow?: string; title: string; body?: string; ctaLabel?: string | null; ctaHref?: string | null },
) {
  return {
    eyebrow: block?.eyebrow ?? fallback.eyebrow,
    title: block?.title ?? fallback.title,
    body: block?.body || fallback.body || "",
    ctaLabel: block?.ctaLabel ?? fallback.ctaLabel ?? null,
    ctaHref: block?.ctaHref ?? fallback.ctaHref ?? null,
  };
}

export function BlockBody({ block, fallback }: { block?: PublicContentBlock; fallback?: string }) {
  const body = block?.body || fallback;
  if (!body?.trim()) return null;
  return <div dangerouslySetInnerHTML={{ __html: cmsBodyHtml(body) }} />;
}

export function blockPlainText(block: PublicContentBlock | undefined, fallback = "") {
  return htmlToText(block?.body || fallback);
}
