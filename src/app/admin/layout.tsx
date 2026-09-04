import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getLogoUrl(): Promise<string> {
  try {
    const s = await getSiteSettings();
    if (s.logoId) {
      const [logo] = await db.select({ key: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.id, s.logoId)).limit(1);
      if (logo) return `/api/media/${logo.key}`;
    }
  } catch {}
  return "/favicon.svg";
}

export async function generateMetadata(): Promise<Metadata> {
  const iconUrl = await getLogoUrl();
  return {
    title: "CGZSA Content System",
    robots: { index: false, follow: false },
    icons: { icon: iconUrl, shortcut: iconUrl, apple: iconUrl },
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--color-paper)]">{children}</div>;
}
