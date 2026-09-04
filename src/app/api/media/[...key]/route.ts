import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { read } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Files are stored outside the web root and served through here, so that the
 * content type is set by us rather than inferred, and nothing in the storage
 * directory is directly reachable (design review §10).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = key.join("/");

  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.storageKey, storageKey)).limit(1);
  if (!asset || asset.deletedAt) return new Response("Not found", { status: 404 });

  try {
    const buf = await read(storageKey);
    const isImage = asset.mimeType.startsWith("image/");
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": asset.mimeType,
        "content-length": String(buf.length),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "content-disposition": isImage
          ? "inline"
          : `attachment; filename="${asset.originalName.replace(/["\\]/g, "")}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
