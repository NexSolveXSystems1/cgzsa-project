import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { mediaStoryImage, type StoryImage } from "./storyImages";

export async function settingImage(imageId: string | null | undefined, fallback: StoryImage) {
  if (!imageId) return fallback;

  const [asset] = await db
    .select({ key: mediaAssets.storageKey, alt: mediaAssets.altText })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, imageId))
    .limit(1);

  return mediaStoryImage(asset?.key, asset?.alt, fallback);
}
