import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/settings";
import { JsonLd, organisationJsonLd } from "@/lib/seo";
import { currentSiteLogoUrl, TEMPORARY_SITE_LOGO_URL } from "@/components/siteLogo";

export const dynamic = 'force-dynamic';

async function getLogoUrl(): Promise<string> {
  return currentSiteLogoUrl();
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const iconUrl = await getLogoUrl();
  return {
    title: { default: `${s.orgName} (${s.shortName})`, template: s.titleTemplate },
    description: s.defaultDescription,
    metadataBase: new URL(process.env.APP_URL ?? `https://${s.canonicalDomain}`),
    alternates: { canonical: "./" },
    openGraph: {
      siteName: s.orgName,
      type: "website",
      locale: "en_LR",
      images: [{ url: iconUrl !== TEMPORARY_SITE_LOGO_URL ? iconUrl : "/og-default.png", width: 1200, height: 630, alt: s.orgName }],
    },
    twitter: { card: "summary_large_image", images: [iconUrl !== TEMPORARY_SITE_LOGO_URL ? iconUrl : "/og-default.png"] },
    icons: { icon: iconUrl, shortcut: iconUrl, apple: iconUrl },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const org = await organisationJsonLd();
  const iconUrl = await getLogoUrl();
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={iconUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        {children}
        {/* Organization data, built from site settings rather than hardcoded, so
            a phone number corrected in the CMS is corrected here too. */}
        <JsonLd data={org} />
      </body>
    </html>
  );
}
