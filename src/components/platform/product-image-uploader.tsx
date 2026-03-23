"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ProductImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string;
  max?: number;
}

interface LibraryImage {
  name: string;
  path: string;
  url: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Image Library Modal
// ---------------------------------------------------------------------------

function ImageLibraryModal({
  open,
  onClose,
  onSelect,
  currentImages,
  max,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  currentImages: string[];
  max: number;
}) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 48;

  const remaining = max - currentImages.length;

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setOffset(0);
    loadImages(0, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadImages(newOffset: number, q: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(newOffset),
      });
      if (q) params.set("search", q);
      const res = await fetch(`/api/platform/images/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (newOffset === 0) {
          setImages(data.images);
        } else {
          setImages((prev) => [...prev, ...data.images]);
        }
        setTotal(data.total);
        setOffset(newOffset);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(q: string) {
    setSearch(q);
    setOffset(0);
    loadImages(0, q);
  }

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else if (next.size < remaining) {
        next.add(url);
      }
      return next;
    });
  }

  function handleConfirm() {
    onSelect(Array.from(selected));
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 mx-4 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-800">Billedbibliotek</h2>
            <p className="text-xs text-stone-400">
              {total} billeder tilg\u00E6ngelige
              {selected.size > 0 && ` \u00B7 ${selected.size} valgt`}
              {remaining < max && ` \u00B7 Plads til ${remaining} mere`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-stone-100 px-6 py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="S\u00F8g i billeder..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
          />
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && images.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
            </div>
          ) : images.length === 0 ? (
            <div className="py-16 text-center text-sm text-stone-400">
              Ingen billeder fundet
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
                {images.map((img) => {
                  const isSelected = selected.has(img.url);
                  const isAlreadyUsed = currentImages.includes(img.url);
                  return (
                    <button
                      key={img.path}
                      type="button"
                      disabled={isAlreadyUsed}
                      onClick={() => toggleSelect(img.url)}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                        isAlreadyUsed
                          ? "cursor-not-allowed border-stone-100 opacity-40"
                          : isSelected
                          ? "border-green-500 ring-2 ring-green-500/20"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {isAlreadyUsed && (
                        <div className="absolute bottom-1 left-1 rounded bg-stone-800/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          I brug
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Load more */}
              {offset + limit < total && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => loadImages(offset + limit, search)}
                    disabled={loading}
                    className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {loading ? "Indl\u00E6ser..." : `Vis flere (${total - offset - limit} tilbage)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4">
          <p className="text-xs text-stone-400">
            {selected.size} billede{selected.size !== 1 ? "r" : ""} valgt
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Tilf\u00F8j {selected.size > 0 ? `${selected.size} billede${selected.size !== 1 ? "r" : ""}` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductImageUploader({
  images,
  onChange,
  folder,
  max = 8,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
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

  function handleLibrarySelect(urls: string[]) {
    onChange([...images, ...urls]);
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
                    title="Flyt til h\u00F8jre"
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
        <div className="flex gap-3">
          {/* Upload drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
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
              {uploading ? "Uploader\u2026" : "Tr\u00E6k billeder hertil eller klik for at v\u00E6lge"}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              JPEG, PNG eller WebP \u00B7 Max 10MB \u00B7 {images.length}/{max} billeder
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

          {/* Library button */}
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 transition-colors hover:border-stone-400 hover:bg-stone-100"
          >
            <svg
              className="h-7 w-7 text-stone-400"
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <span className="text-xs font-medium text-stone-500">Bibliotek</span>
          </button>
        </div>
      )}

      {/* Library modal */}
      <ImageLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
        currentImages={images}
        max={max}
      />
    </div>
  );
}
