import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { getSiteSettings } from "@/lib/settings";

export const TEMPORARY_SITE_LOGO_URL = "/logo.png";

export async function siteLogoUrl(logoId?: string | null) {
  if (!logoId) return TEMPORARY_SITE_LOGO_URL;

  const [logo] = await db
    .select({ key: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, logoId))
    .limit(1);

  return logo ? `/api/media/${logo.key}` : TEMPORARY_SITE_LOGO_URL;
}

export async function currentSiteLogoUrl() {
  try {
    const settings = await getSiteSettings();
    return siteLogoUrl(settings.logoId);
  } catch {
    return TEMPORARY_SITE_LOGO_URL;
  }
}
