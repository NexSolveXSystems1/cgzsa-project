/**
 * File storage.
 *
 * Design review §10: the declared extension and MIME type are ignored. The real
 * type is read from the file's leading bytes, images are re-encoded through a
 * processing pipeline (which destroys any embedded payload), the stored name is
 * random, and files live outside the web root and are served through a handler.
 */
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/log";

const log = logger("storage");

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOC_BYTES = 25 * 1024 * 1024;

type Sniffed = { kind: "image" | "pdf"; mime: string; ext: string };

/** Read the true type from the leading bytes. Never trust the filename. */
export function sniff(buf: Buffer): Sniffed | null {
  const b = buf;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { kind: "image", mime: "image/png", ext: "png" };
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP")
    return { kind: "image", mime: "image/webp", ext: "webp" };
  if (b.subarray(4, 12).toString("ascii").includes("ftypavif"))
    return { kind: "image", mime: "image/avif", ext: "avif" };
  if (b.subarray(0, 5).toString("ascii") === "%PDF-") return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  return null; // SVG, executables, archives and everything else are refused
}

function root() {
  return process.env.STORAGE_PATH ?? "./storage";
}

function getS3Client() {
  if (process.env.STORAGE_DRIVER !== "s3") return null;
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "",
      secretAccessKey: process.env.S3_SECRET_KEY || "",
    },
  });
}

export type Stored = {
  storageKey: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
};

/**
 * `originalName` is accepted and deliberately not used: the stored filename is a
 * random UUID so that nothing an uploader chooses reaches the filesystem. The
 * caller keeps the original name in the database for display.
 */
export async function store(buf: Buffer, _originalName: string): Promise<Stored> {
  const kind = sniff(buf);
  if (!kind) {
    throw new UploadError(
      "That file type is not accepted. Images (JPEG, PNG, WebP, AVIF) and PDF documents only.",
    );
  }
  if (kind.kind === "image" && buf.length > MAX_IMAGE_BYTES) {
    throw new UploadError("That image is larger than 8 MB. Please reduce it and try again.");
  }
  if (kind.kind === "pdf" && buf.length > MAX_DOC_BYTES) {
    throw new UploadError("That document is larger than 25 MB.");
  }

  const key = `${new Date().getFullYear()}/${randomUUID()}.${kind.kind === "image" ? "webp" : kind.ext}`;
  let finalBuffer = buf;
  let width, height;
  let mimeType = kind.mime;

  if (kind.kind === "image") {
    try {
      const img = sharp(buf, { failOn: "error", limitInputPixels: 100_000_000 }).rotate();
      const meta = await img.metadata();
      finalBuffer = await img.resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      width = meta.width;
      height = meta.height;
      mimeType = "image/webp";
    } catch (err) {
      log.warn("image failed to decode", { err });
      throw new UploadError("That image could not be read. It may be damaged — try re-saving or exporting it again.");
    }
  }

  const s3 = getS3Client();
  if (s3) {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: finalBuffer,
      ContentType: mimeType,
    }));
  } else {
    const target = path.resolve(/*turbopackIgnore: true*/ root(), key);
    await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ target, finalBuffer);
  }

  return { storageKey: key, mimeType, bytes: finalBuffer.length, width, height };
}

/**
 * Resolve a storage key to an absolute path, refusing anything that climbs out
 * of the storage directory.
 */
function resolveWithin(storageKey: string) {
  const base = path.resolve(/*turbopackIgnore: true*/ root());
  const target = path.resolve(/*turbopackIgnore: true*/ base, path.normalize(storageKey));
  if (target !== base && !target.startsWith(base + path.sep)) throw new UploadError("Bad path");
  return target;
}

export async function read(storageKey: string): Promise<Buffer> {
  const s3 = getS3Client();
  if (s3) {
    try {
      const res = await s3.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: storageKey,
      }));
      const stream = res.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    } catch {
      throw new Error("File not found on S3");
    }
  } else {
    return readFile(/*turbopackIgnore: true*/ resolveWithin(storageKey));
  }
}

export async function remove(storageKey: string) {
  const s3 = getS3Client();
  if (s3) {
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: storageKey,
      }));
    } catch {
      /* already gone */
    }
  } else {
    try {
      await unlink(resolveWithin(storageKey));
    } catch {
      /* already gone */
    }
  }
}

export class UploadError extends Error {}

export function humanBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
