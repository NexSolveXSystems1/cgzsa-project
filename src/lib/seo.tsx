import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, seoMeta } from "@/db/schema";
import { getSiteSettings } from "./settings";
import { logger } from "@/lib/log";

const log = logger("seo");

/**
 * Canonical URLs, share images and structured data.
 *
 * A browser audit of sixteen public pages found no canonical link, no og:image
 * and no JSON-LD on any of them, though site_settings has carried a
 * canonicalDomain all along. The practical effects: /about and /about/[section]
 * risk being read as duplicates; every share of a CGZSA link on WhatsApp or
 * Facebook — the channels this audience actually uses — renders as a grey box;
 * and a search result for the organisation carries no contact panel.
 */

/** The absolute URL for a path on this site. */
export async function canonicalUrl(path: string): Promise<string> {
  const s = await getSiteSettings();
  const base = process.env.APP_URL ?? `https://${s.canonicalDomain}`;
  return new URL(path, base).toString();
}

/**
 * Per-record SEO overrides, if an editor has set any.
 *
 * The seo_meta table existed from the beginning and was read by nothing. This
 * is the reader: a title, description, canonical or share image set against a
 * page, article or programme wins over the defaults derived from site settings.
 * Returns nulls rather than throwing when the table has no row, so a page
 * without overrides costs one indexed lookup and nothing else.
 */
export async function seoOverrides(
  kind: "page" | "article" | "program",
  id: string,
): Promise<{ title: string | null; description: string | null; canonical: string | null; image: string | null; noindex: boolean }> {
  const column =
    kind === "page" ? seoMeta.pageId : kind === "article" ? seoMeta.articleId : seoMeta.programId;

  try {
    const [row] = await db
      .select({
        title: seoMeta.title,
        description: seoMeta.description,
        canonical: seoMeta.canonical,
        noindex: seoMeta.noindex,
        imageKey: mediaAssets.storageKey,
      })
      .from(seoMeta)
      .leftJoin(mediaAssets, eq(mediaAssets.id, seoMeta.ogImageId))
      .where(eq(column, id))
      .limit(1);

    return {
      title: row?.title ?? null,
      description: row?.description ?? null,
      canonical: row?.canonical ?? null,
      image: row?.imageKey ? `/api/media/${row.imageKey}` : null,
      noindex: row?.noindex ?? false,
    };
  } catch (err) {
    // Metadata must never be the reason a page fails to render.
    log.error("override lookup failed", { err });
    return { title: null, description: null, canonical: null, image: null, noindex: false };
  }
}

export async function saveSeoMeta(
  kind: "page" | "article" | "program",
  entityId: string,
  data: { title?: string | null; description?: string | null; canonical?: string | null; noindex?: boolean; ogImageId?: string | null },
) {
  const column = kind === "page" ? seoMeta.pageId : kind === "article" ? seoMeta.articleId : seoMeta.programId;
  const [existing] = await db.select({ id: seoMeta.id }).from(seoMeta).where(eq(column, entityId)).limit(1);

  const values = {
    title: data.title || null,
    description: data.description || null,
    canonical: data.canonical || null,
    noindex: data.noindex ?? false,
    ogImageId: data.ogImageId || null,
    pageId: kind === "page" ? entityId : null,
    articleId: kind === "article" ? entityId : null,
    programId: kind === "program" ? entityId : null,
  };

  if (existing) {
    await db.update(seoMeta).set(values).where(eq(seoMeta.id, existing.id));
  } else {
    await db.insert(seoMeta).values(values);
  }
}

/**
 * Metadata for a public page: canonical, Open Graph and Twitter card in one
 * place, so a new route cannot quietly ship without them.
 *
 * Pass `override` from seoOverrides() to let an editor's settings win.
 */
export async function pageMetadata(opts: {
  path: string;
  title?: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: Date | null;
  noindex?: boolean;
  override?: Awaited<ReturnType<typeof seoOverrides>>;
}): Promise<Metadata> {
  const s = await getSiteSettings();
  const o = opts.override;

  // An editor's explicit override beats the value derived from the record,
  // which in turn beats the site-wide default.
  const title = o?.title || opts.title;
  const description = o?.description || opts.description || s.defaultDescription;
  const url = o?.canonical || (await canonicalUrl(opts.path));
  const image = o?.image ?? opts.image ?? "/og-default.png";
  const noindex = o?.noindex || opts.noindex;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: title ?? `${s.orgName} (${s.shortName})`,
      description,
      url,
      siteName: s.orgName,
      locale: "en_LR",
      type: opts.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: s.orgName }],
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? `${s.orgName} (${s.shortName})`,
      description,
      images: [image],
    },
  };
}

/**
 * Organization structured data, rendered once in the root layout. Built from
 * site settings rather than hardcoded, so correcting a phone number in the CMS
 * corrects it here too.
 */
export async function organisationJsonLd() {
  const s = await getSiteSettings();
  const base = process.env.APP_URL ?? `https://${s.canonicalDomain}`;
  const social = [s.facebookUrl, s.twitterUrl, s.instagramUrl, s.linkedinUrl, s.youtubeUrl].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: s.orgName,
    alternateName: s.shortName,
    url: base,
    description: s.defaultDescription,
    slogan: s.motto,
    foundingDate: "2025-04-20",
    address: { "@type": "PostalAddress", streetAddress: s.office, addressCountry: "LR" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "general enquiries",
      email: s.email,
      telephone: [s.phone1, s.phone2, s.phone3].filter(Boolean),
      areaServed: "LR",
      availableLanguage: "en",
    },
    ...(social.length ? { sameAs: social } : {}),
  };
}

/** Breadcrumbs, so a search result shows the path rather than a bare URL. */
export async function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  const items = await Promise.all(
    crumbs.map(async (c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: await canonicalUrl(c.path),
    })),
  );
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

/** Render a JSON-LD block. The value is serialised, never interpolated raw. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapes the content; the < replacement stops a value
      // containing "</script>" from closing this element early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
