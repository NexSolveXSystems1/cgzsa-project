import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { getSiteSettings } from "@/lib/settings";
import { htmlToText } from "@/lib/sanitise";

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const s = await getSiteSettings();
  const base = process.env.APP_URL ?? `https://${s.canonicalDomain}`;
  const rows = await db.select().from(articles)
    .where(and(eq(articles.status, "PUBLISHED"), isNull(articles.deletedAt)))
    .orderBy(desc(articles.publishedAt)).limit(30);

  const items = rows.map((a) => `
    <item>
      <title>${esc(a.title)}</title>
      <link>${base}/news/${a.slug}</link>
      <guid isPermaLink="true">${base}/news/${a.slug}</guid>
      <description>${esc(a.excerpt || htmlToText(a.body).slice(0, 300))}</description>
      <pubDate>${new Date(a.publishedAt ?? a.createdAt).toUTCString()}</pubDate>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(s.orgName)}</title>
  <link>${base}</link>
  <description>${esc(s.defaultDescription)}</description>
  <language>en</language>${items}
</channel></rss>`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
