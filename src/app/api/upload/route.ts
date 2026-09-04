import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { getActor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { sniff, store, UploadError, MAX_DOC_BYTES } from "@/lib/storage";
import { logger } from "@/lib/log";

const log = logger("upload");

export const runtime = "nodejs";

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor || !actor.permissions.has("media.upload")) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  // Signed in is not the same as unlimited: 40 uploads in ten minutes is far
  // more than an editor needs and far less than it takes to fill a volume.
  if (!rateLimit(`upload:${actor.id}`, 40, 600_000).ok) {
    return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const altText = String(form?.get("altText") ?? "").trim();

  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_DOC_BYTES) return NextResponse.json({ error: "That file is too large." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());

  // What the file actually is, not what the client said it was. The alt-text
  // requirement previously keyed on file.type, which the client sets, so a
  // genuine JPEG labelled application/pdf skipped the check entirely and was
  // stored with its filename as the alternative text. Everything else in this
  // path already ignored the client's claim; this check now does too.
  const kind = sniff(buf);
  if (!kind) {
    return NextResponse.json(
      { error: "That file type is not accepted. Images (JPEG, PNG, WebP, AVIF) and PDF documents only." },
      { status: 400 },
    );
  }
  if (kind.kind === "image" && altText.length < 3) {
    return NextResponse.json({ error: "Describe the image for screen readers before uploading it." }, { status: 400 });
  }

  try {
    const stored = await store(buf, file.name);
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        storageKey: stored.storageKey,
        originalName: file.name.slice(0, 200),
        mimeType: stored.mimeType,
        bytes: stored.bytes,
        width: stored.width ?? null,
        height: stored.height ?? null,
        // A PDF needs no alternative text; an image never reaches here without one.
        altText: altText || file.name.slice(0, 200),
      })
      .returning();
    await audit(actor, "media.upload", `media:${asset.id}`, `${file.name} · ${stored.bytes} bytes`);
    return NextResponse.json({ ok: true, asset: { id: asset.id, key: asset.storageKey, altText: asset.altText } });
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    log.error("failed", { err });
    return NextResponse.json({ error: "That file could not be stored." }, { status: 500 });
  }
}
