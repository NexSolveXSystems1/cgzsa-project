import type { Metadata } from "next";
import { currentSiteLogoUrl } from "@/components/siteLogo";

async function getLogoUrl(): Promise<string> {
  return currentSiteLogoUrl();
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
