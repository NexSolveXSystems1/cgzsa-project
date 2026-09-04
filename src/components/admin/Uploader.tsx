"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function Uploader({ accept = "image/*,application/pdf" }: { accept?: string }) {
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("altText", alt);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setAlt("");
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="altText">Alt text <span className="text-[var(--color-danger)]">*</span></label>
        <input
          id="altText" value={alt} onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image for someone who cannot see it"
          className="input"
        />
        <div className="hint">Required for images. The system will not store one without it.</div>
      </div>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void upload(f); }}
        className="block rounded-lg border-2 border-dashed border-[var(--color-line-2)] bg-[var(--color-surface-2)]
                   px-6 py-10 text-center text-[0.87rem] text-[var(--color-ink-3)] cursor-pointer
                   hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
      >
        <input
          ref={input} type="file" accept={accept} className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
        />
        {busy ? "Uploading…" : "Drop a file here, or click to choose"}
        <div className="font-mono text-[0.72rem] mt-2">
          JPEG, PNG, WebP, AVIF or PDF · images up to 8 MB · the real type is read from the file itself
        </div>
      </label>

      {error && <p role="alert" className="text-[0.82rem] text-[var(--color-danger)] mt-3">{error}</p>}
    </div>
  );
}
