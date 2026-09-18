import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { articles, events, pages, programs, projects, publications } from "@/db/schema";
import { getSiteSettings } from "@/lib/settings";

/**
 * The sitemap listed 17 URLs against roughly 25 public routes: news, events,
 * projects, publications, the gallery and three of the four legal pages were all
 * missing, so nothing linked only from a listing page was reliably discoverable.
 *
 * Every dynamic section is now generated from the same predicate the pages
 * themselves use — published, not deleted — so a section cannot be published and
 * quietly left out of the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getSiteSettings();
  const base = process.env.APP_URL ?? `https://${s.canonicalDomain}`;

  const live = <T extends { status: unknown; deletedAt: unknown }>(t: T) =>
    and(eq(t.status as never, "PUBLISHED"), isNull(t.deletedAt as never));

  const [pageRows, programRows, projectRows, articleRows, eventRows, publicationRows] = await Promise.all([
    db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(live(pages)),
    db.select({ slug: programs.slug, updatedAt: programs.updatedAt }).from(programs).where(live(programs)),
    db.select({ slug: projects.slug, updatedAt: projects.updatedAt }).from(projects).where(live(projects)),
    db.select({ slug: articles.slug, updatedAt: articles.updatedAt }).from(articles).where(live(articles)),
    db.select({ slug: events.slug, updatedAt: events.updatedAt }).from(events).where(live(events)),
    db.select({ slug: publications.slug, updatedAt: publications.updatedAt }).from(publications).where(live(publications)),
  ]);

  // Every statically routed public page, including the ones previously omitted.
  const fixed: [string, number][] = [
    ["", 1],
    ["/about", 0.9],
    ["/about/structure", 0.7],
    ["/programs", 0.9],
    ["/projects", 0.8],
    ["/news", 0.8],
    ["/events", 0.8],
    ["/contact", 0.9],
    ["/search", 0.4],
    ["/resources/faqs", 0.7],
    ["/resources/publications", 0.7],
    ["/resources/gallery", 0.6],
    ["/get-involved/volunteer", 0.9],
    ["/get-involved/partner", 0.8],
    ["/get-involved/donate", 0.8],
    ["/privacy-policy", 0.3],
    ["/cookie-policy", 0.3],
    ["/terms", 0.3],
    ["/accessibility", 0.4],
  ];

  const dynamic: MetadataRoute.Sitemap = [
    ...pageRows.map((r) => ({ url: `${base}/${r.slug}`, lastModified: r.updatedAt, priority: 0.8 })),
    ...programRows.map((r) => ({ url: `${base}/programs/${r.slug}`, lastModified: r.updatedAt, priority: 0.9 })),
    ...projectRows.map((r) => ({ url: `${base}/projects/${r.slug}`, lastModified: r.updatedAt, priority: 0.7 })),
    ...articleRows.map((r) => ({ url: `${base}/news/${r.slug}`, lastModified: r.updatedAt, priority: 0.6 })),
    ...eventRows.map((r) => ({ url: `${base}/events/${r.slug}`, lastModified: r.updatedAt, priority: 0.6 })),
    ...publicationRows.map((r) => ({
      url: `${base}/resources/publications/${r.slug}`,
      lastModified: r.updatedAt,
      priority: 0.6,
    })),
  ];

  // A page row whose slug is one of the fixed routes would otherwise appear
  // twice, which search engines read as a duplicate-content signal.
  const seen = new Set<string>();
  return [
    ...fixed.map(([p, priority]) => ({
      url: base + p,
      changeFrequency: "monthly" as const,
      priority,
    })),
    ...dynamic,
  ].filter((entry) => (seen.has(entry.url) ? false : (seen.add(entry.url), true)));
}
