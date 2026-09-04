import { desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { PageHead, EmptyState } from "@/components/public/PageHead";

export const revalidate = 300;
export const metadata = { title: "Media Gallery" };

export default async function Gallery() {
  const images = await db.select().from(mediaAssets)
    .where(isNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.createdAt)).limit(120);
  const photos = images.filter((i) => i.mimeType.startsWith("image/"));

  return (
    <>
      <PageHead crumbs={[["Home", "/"], ["Resources"], ["Gallery"]]} eyebrow="Resources" title="Media Gallery"
        lede="Photographs from our clean-ups, installations and community work." />
      <section className="py-14"><div className="wrap">
        {photos.length === 0 ? (
          <EmptyState title="No photographs uploaded yet"
            body="Every image requires alt text before it can be published — the content system will not accept one without it." />
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {photos.map((p) => (
              <figure key={p.id} className="card overflow-hidden m-0">
                <div className="aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${p.storageKey}`}
                    alt={p.altText}
                    // Intrinsic size from the stored dimensions, so the grid
                    // reserves the space and does not shift as images arrive —
                    // the shift is most disruptive on the slow connections this
                    // site is built for. Falls back to the tile's aspect ratio.
                    width={p.width ?? 800}
                    height={p.height ?? 600}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                {p.caption && <figcaption className="px-3.5 py-2.5 text-[0.82rem] text-[var(--color-ink-2)]">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
