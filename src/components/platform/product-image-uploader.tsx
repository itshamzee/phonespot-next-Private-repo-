"use client";

import { useState, useCallback, useRef } from "react";

interface ProductImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string;
  max?: number;
}

export function ProductImageUploader({
  images,
  onChange,
  folder,
  max = 8,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, max - images.length);
      if (fileArray.length === 0) return;

      setUploading(true);
      const newUrls: string[] = [];

      for (const file of fileArray) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        try {
          const res = await fetch("/api/platform/images/upload", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            newUrls.push(data.url);
          }
        } catch {
          // skip failed uploads
        }
      }

      onChange([...images, ...newUrls]);
      setUploading(false);
    },
    [images, onChange, folder, max]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      upload(e.dataTransfer.files);
    }
  }

  function handleRemove(index: number) {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  }

  function handleReorder(from: number, to: number) {
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
            >
              <img
                src={url}
                alt={`Product image ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  Hoved
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(i, i - 1)}
                    className="rounded-lg bg-white/90 p-1.5 text-stone-700 hover:bg-white"
                    title="Flyt til venstre"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-600"
                  title="Fjern"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(i, i + 1)}
                    className="rounded-lg bg-white/90 p-1.5 text-stone-700 hover:bg-white"
                    title="Flyt til højre"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < max && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-green-500 bg-green-50"
              : "border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100"
          }`}
        >
          <svg
            className="mb-2 h-8 w-8 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="text-sm font-medium text-stone-600">
            {uploading ? "Uploader…" : "Træk billeder hertil eller klik for at vælge"}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            JPEG, PNG eller WebP · Max 10MB · {images.length}/{max} billeder
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => e.target.files && upload(e.target.files)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
