"use client";

import { useState, useRef } from "react";

type Asset = {
  id: string;
  originalName: string;
  storageKey: string;
  altText: string;
};

export function MediaPicker({
  name,
  defaultValue = "",
  assets = [],
  label = "Featured Image",
}: {
  name: string;
  defaultValue?: string | null;
  assets?: Asset[];
  label?: string;
}) {
  const [items, setItems] = useState<Asset[]>(assets);
  const [selectedId, setSelectedId] = useState<string>(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAsset = items.find((a) => a.id === selectedId);

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

      const newAsset: Asset = {
        id: json.asset.id,
        originalName: file.name,
        storageKey: json.asset.key,
        altText: json.asset.altText,
      };

      setItems((prev) => [newAsset, ...prev]);
      setSelectedId(newAsset.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-3 p-3.5 border border-[var(--color-line)] rounded-lg bg-[var(--color-surface-2)]/60" suppressHydrationWarning>
      <input type="hidden" name={name} value={selectedId} />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.83rem] font-semibold text-[var(--color-ink)]">{label}</span>
        {selectedId && (
          <button
            type="button"
            onClick={() => setSelectedId("")}
            className="text-[0.75rem] text-[var(--color-danger)] hover:underline"
          >
            Clear image
          </button>
        )}
      </div>

      {currentAsset ? (
        <div className="flex items-center gap-3 bg-white p-2 rounded-md border border-[var(--color-line)]">
          <div className="w-14 h-14 rounded overflow-hidden bg-[var(--color-surface-3)] shrink-0 grid place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/${currentAsset.storageKey}`}
              alt={currentAsset.altText}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <b className="block text-[0.82rem] truncate">{currentAsset.originalName}</b>
            <span className="text-[0.72rem] text-[var(--color-ink-3)] block truncate">{currentAsset.altText}</span>
          </div>
        </div>
      ) : (
        <div className="text-[0.78rem] text-[var(--color-ink-3)] italic">No image selected</div>
      )}

      <div className="grid gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input text-[0.83rem]"
        >
          <option value="">-- Choose from existing media --</option>
          {items.map((a) => (
            <option key={a.id} value={a.id}>
              {a.originalName} ({a.altText})
            </option>
          ))}
        </select>

        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            id={`direct-upload-${name}`}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
          />
          <label
            htmlFor={`direct-upload-${name}`}
            className="btn btn-ghost btn-sm w-full border border-dashed border-[var(--color-brand)] text-[var(--color-brand)] cursor-pointer text-center justify-center"
          >
            {uploading ? "Uploading Image..." : "⬆ Upload New Image Directly"}
          </label>
        </div>
      </div>

      {error && <p className="text-[0.78rem] text-[var(--color-danger)] m-0">{error}</p>}
    </div>
  );
}
