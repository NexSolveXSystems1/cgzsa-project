"use client";

import { useId, useState, useRef } from "react";

export function ImagePicker({
  name,
  images,
  selected,
}: {
  name: string;
  images: { id: string; alt: string; key: string }[];
  selected: string | null;
}) {
  const [items, setItems] = useState<{ id: string; alt: string; key: string }[]>(images);
  const [value, setValue] = useState(selected ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleFileUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("altText", file.name.replace(/\.[^/.]+$/, ""));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");

      const newImg = {
        id: json.asset.id,
        alt: json.asset.altText,
        key: json.asset.key,
      };

      setItems((prev) => [newImg, ...prev]);
      setValue(newImg.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2.5" suppressHydrationWarning>
      <input type="hidden" name={name} value={value} />

      <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-auto p-1 border border-[var(--color-line)] rounded-md">
        <button
          type="button"
          onClick={() => setValue("")}
          className={
            "aspect-[4/3] rounded border grid place-items-center text-[0.72rem] font-medium " +
            (value === ""
              ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
              : "border-[var(--color-line)] text-[var(--color-ink-3)]")
          }
        >
          None
        </button>
        {items.map((im) => (
          <button
            key={im.id}
            type="button"
            title={im.alt}
            onClick={() => setValue(im.id)}
            className={
              "aspect-[4/3] rounded border overflow-hidden transition-all " +
              (value === im.id
                ? "border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/40"
                : "border-[var(--color-line)] opacity-85 hover:opacity-100")
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${im.key}`} alt={im.alt} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          id={inputId}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file);
          }}
        />
        <label
          htmlFor={inputId}
          className="btn btn-ghost btn-sm w-full border border-dashed border-[var(--color-brand)] text-[var(--color-brand)] cursor-pointer text-center justify-center"
        >
          {uploading ? "Uploading..." : "⬆ Upload Image File Directly"}
        </label>
      </div>

      {error && <p className="text-[0.75rem] text-[var(--color-danger)] m-0">{error}</p>}
    </div>
  );
}
