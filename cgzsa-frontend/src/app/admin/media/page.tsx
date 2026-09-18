import { desc } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Note } from "@/components/admin/kit";
import { Uploader } from "@/components/admin/Uploader";
import { humanBytes } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { MediaActions } from "@/components/admin/MediaActions";

export const dynamic = "force-dynamic";

export default async function Media() {
  const actor = await guard("media.upload");
  const assets = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(120);

  return (
    <Shell actor={actor} active="/admin/media" title="Media library">
      <Note title="How uploads are handled">
        Every file is checked against its own leading bytes rather than its name or declared type. Images are re-encoded,
        which destroys anything embedded in them, given a random filename, and stored outside the web root. Executables
        and SVG files are refused. Removing a file hides it and is reversible; deleting it permanently also removes it
        from storage, and is refused while any page still uses it. Anything removed and left for thirty days is deleted
        automatically.
      </Note>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        <Panel title="Add a file"><Uploader /></Panel>

        <Panel title={`${assets.length} file${assets.length === 1 ? "" : "s"}`}>
          {assets.length === 0 ? (
            <p className="text-[0.85rem] text-[var(--color-ink-3)] m-0">
              Nothing uploaded yet. The gallery, programme pages, news articles and team profiles all draw their images
              from here.
            </p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
              {assets.map((a) => (
                <div key={a.id} className={"border rounded-lg overflow-hidden bg-white flex flex-col " + (a.deletedAt ? "border-dashed border-[var(--color-line-2)] opacity-70" : "border-[var(--color-line)]")}>
                  <div className="aspect-[4/3] bg-[var(--color-surface-2)] grid place-items-center overflow-hidden">
                    {a.mimeType.startsWith("image/") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={`/api/media/${a.storageKey}`} alt={a.altText} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-mono text-[0.68rem] text-[var(--color-ink-3)]">PDF</span>
                    )}
                  </div>
                  <div className="px-3 py-2 flex-1">
                    <b className="block text-[0.78rem] font-semibold truncate">{a.originalName}</b>
                    <span className="font-mono text-[0.68rem] text-[var(--color-ink-3)]">
                      {humanBytes(a.bytes)} · {formatDate(a.createdAt)}
                    </span>
                  </div>
                  <MediaActions
                    assetId={a.id}
                    deleted={!!a.deletedAt}
                    mayPurge={actor.permissions.has("content.purge")}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
