/**
 * The assistant's knowledge base.
 *
 * Design review §14: the assistant reads CGZSA's own published content and
 * nothing else. This module turns published records into retrievable passages
 * and scores them against a question.
 *
 * Retrieval uses PostgreSQL full-text search rather than a vector database, so
 * the system needs no external API key and no second service. The `embedding`
 * column exists for a later upgrade to pgvector; nothing else has to change.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles, contentBlocks, faqs, knowledgePassages, knowledgeSources, pages, programs, publications, siteSettings,
} from "@/db/schema";

const STOP = new Set([
  "a","an","and","are","as","at","be","by","can","do","does","for","from","has","have","how","i",
  "in","is","it","its","of","on","or","that","the","to","was","we","what","when","where","which",
  "who","why","will","with","you","your","our","us","me","my","if","there","this","they","them",
  "about","into","over","under","than","then","some","any","all","more","most","much","many",
  "did","done","get","got","also","just","like","very","been","being","were","would","could",
  "should","must","may","might","please","tell","know","there's","here","out","up","down",
]);

export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function chunk(title: string, url: string, body: string, max = 900) {
  const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: { title: string; url: string; body: string }[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max && buf) {
      out.push({ title, url, body: buf });
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) out.push({ title, url, body: buf });
  return out;
}

/** Rebuild the index from everything currently published. */
export async function buildPassages() {
  const groups: { kind: string; label: string; items: { title: string; url: string; body: string }[] }[] = [];

  const publishedPages = await db
    .select()
    .from(pages)
    .where(and(eq(pages.status, "PUBLISHED"), isNull(pages.deletedAt)));
  groups.push({
    kind: "pages",
    label: "Published pages",
    items: publishedPages.flatMap((p) =>
      chunk(p.title, "/" + p.slug, [p.excerpt, p.body].filter(Boolean).join("\n\n")),
    ),
  });

  const publishedBlocks = await db
    .select()
    .from(contentBlocks)
    .where(and(eq(contentBlocks.status, "PUBLISHED"), isNull(contentBlocks.deletedAt)));
  groups.push({
    kind: "content_blocks",
    label: "Page section content",
    items: publishedBlocks.flatMap((b) =>
      chunk(
        b.title,
        b.page === "home" ? "/" : "/" + b.page,
        [b.eyebrow, b.title, b.body].filter(Boolean).join("\n\n"),
      ),
    ),
  });

  const publishedPrograms = await db
    .select()
    .from(programs)
    .where(and(eq(programs.status, "PUBLISHED"), isNull(programs.deletedAt)));
  groups.push({
    kind: "programs",
    label: "Programmes",
    items: publishedPrograms.flatMap((p) =>
      chunk(
        p.title,
        "/programs/" + p.slug,
        [
          p.lead,
          "What we do: " + p.activities.join("; ") + ".",
          p.rationale.join("\n\n"),
          p.response,
        ].join("\n\n"),
      ),
    ),
  });

  // Published only. This filter was missing, and every other content type had
  // it — so a FAQ left in DRAFT was indexed the moment it was saved and served
  // on the public search page and by the assistant to anonymous visitors,
  // defeating the editorial workflow for this one content type.
  const liveFaqs = await db.select().from(faqs).where(eq(faqs.status, "PUBLISHED"));
  groups.push({
    kind: "faqs",
    label: "Frequently asked questions",
    items: liveFaqs.map((f) => ({ title: f.question, url: "/resources/faqs", body: f.question + "\n\n" + f.answer })),
  });

  const pubs = await db
    .select()
    .from(publications)
    .where(and(eq(publications.status, "PUBLISHED"), isNull(publications.deletedAt)));
  groups.push({
    kind: "publications",
    label: "Publications and documents",
    items: pubs.map((p) => ({ title: p.title, url: "/resources/publications/" + p.slug, body: [p.title, p.description].filter(Boolean).join("\n\n") })),
  });

  const news = await db
    .select()
    .from(articles)
    .where(and(eq(articles.status, "PUBLISHED"), isNull(articles.deletedAt)));
  groups.push({
    kind: "news",
    label: "News articles",
    items: news.flatMap((a) => chunk(a.title, "/news/" + a.slug, a.excerpt + "\n\n" + a.body)),
  });

  const [settings] = await db.select().from(siteSettings);
  if (settings) {
    groups.push({
      kind: "contact",
      label: "Contact and organisational details",
      items: [
        {
          title: "Contact CGZSA",
          url: "/contact",
          body: [
            `Our principal office is at ${settings.office}.`,
            `Telephone: ${[settings.phone1, settings.phone2, settings.phone3].filter(Boolean).join(", ")}.`,
            `Email: ${settings.email}.`,
            settings.officeHours ? `Office hours: ${settings.officeHours}.` : "",
            `The registered seat of the organisation is ${settings.registeredSeat}.`,
            `Motto: ${settings.motto}.`,
          ].filter(Boolean).join("\n\n"),
        },
      ],
    });
  }

  // One transaction, and a batched insert per group. Previously this deleted the
  // whole index and then re-inserted row by row outside a transaction, so every
  // publish opened a window in which the public search page and the assistant
  // returned nothing — and a failure part-way left the index truncated.
  let passages = 0;
  await db.transaction(async (tx) => {
    await tx.delete(knowledgePassages);
    await tx.delete(knowledgeSources);

    for (const g of groups) {
      const [src] = await tx
        .insert(knowledgeSources)
        .values({ kind: g.kind, label: g.label, automatic: true, itemCount: g.items.length, lastIndexedAt: new Date() })
        .returning({ id: knowledgeSources.id });

      if (!g.items.length) continue;
      const rows = g.items.map((it) => ({
        sourceId: src.id,
        title: it.title,
        url: it.url,
        body: it.body,
        terms: terms(it.title + " " + it.body),
        tokens: Math.ceil(it.body.length / 4),
      }));
      await tx.insert(knowledgePassages).values(rows);
      passages += rows.length;
    }
  });
  return { sources: groups.length, passages };
}

export type Passage = { id: string; title: string; url: string; body: string; score: number };

/**
 * Retrieval over the indexed passages using PostgreSQL full-text search.
 *
 * Ordering is by ts_rank_cd; the confidence returned is the share of the
 * question's meaningful terms that the passage actually contains, which is what
 * makes the configured threshold interpretable to a member of staff.
 */
export async function retrieve(question: string, k = 4): Promise<Passage[]> {
  const q = terms(question);
  if (!q.length) return [];

  const tsquery = q.map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean).join(" | ");
  if (!tsquery) return [];

  // `search` is a generated tsvector column with a GIN index, so this is an
  // index scan rather than a sequential scan that re-analyses every row's text.
  // The term-overlap score that feeds the confidence threshold is computed in
  // TypeScript below from the `terms` array the indexer already stored, which
  // removes both the correlated subquery and the hand-built SQL array literal
  // that previously interpolated user input through sql.raw().
  const rows = await db.execute<{
    id: string; title: string; url: string; body: string; terms: string[]; rank: number;
  }>(sql`
    select p.id, p.title, p.url, p.body, p.terms,
           ts_rank_cd(p.search, to_tsquery('english', ${tsquery})) as rank
      from ${knowledgePassages} p
     where p.search @@ to_tsquery('english', ${tsquery})
     order by rank desc
     limit ${k}
  `);

  let list = Array.from(rows as Iterable<{
    id: string; title: string; url: string; body: string; terms: string[]; rank: number;
  }>);

  if (!list.length) {
    const fallbackRows = await db.execute<{
      id: string; title: string; url: string; body: string; terms: string[]; rank: number;
    }>(sql`
      select p.id, p.title, p.url, p.body, p.terms, 0.1 as rank
        from ${knowledgePassages} p
       order by p.created_at desc
       limit ${k}
    `);
    list = Array.from(fallbackRows as Iterable<{
      id: string; title: string; url: string; body: string; terms: string[]; rank: number;
    }>);
  }

  return list.map((r) => {
    const have = new Set(r.terms ?? []);
    const hits = q.filter((t) => have.has(t)).length;
    return {
      id: r.id,
      title: r.title,
      url: r.url,
      body: r.body,
      score: Math.min(1, hits / q.length),
    };
  });
}

/** Site-wide search, used by /search. Same index, wider result shape. */
export async function searchSite(query: string, limit = 20) {
  const q = terms(query);
  if (!q.length) return [];
  const tsquery = q.map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean).join(" | ");
  if (!tsquery) return [];

  const rows = await db.execute<{ title: string; url: string; body: string; label: string; rank: number }>(sql`
    select p.title, p.url, left(p.body, 220) as body, s.label,
           ts_rank_cd(p.search, to_tsquery('english', ${tsquery})) as rank
      from ${knowledgePassages} p
      join ${knowledgeSources} s on s.id = p.source_id
     where p.search @@ to_tsquery('english', ${tsquery})
     order by rank desc
     limit ${limit}
  `);
  const list = Array.from(rows as Iterable<{ title: string; url: string; body: string; label: string; rank: number }>);
  const seen = new Set<string>();
  return list.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}
