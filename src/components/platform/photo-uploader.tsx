"use client";

import { useState, useRef } from "react";

interface PhotoUploaderProps {
  deviceId: string | null;
  existingPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function PhotoUploader({ deviceId, existingPhotos, onPhotosChange }: PhotoUploaderProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files]);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExisting(url: string) {
    onPhotosChange(existingPhotos.filter((u) => u !== url));
  }

  async function uploadPending(newDeviceId: string): Promise<string[]> {
    if (pendingFiles.length === 0) return [];
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("device_id", newDeviceId);
      pendingFiles.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/platform/devices/upload-photos", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.error ?? "Upload fejlede");
        return [];
      }
      const data = await res.json();
      const urls: string[] = data.urls ?? [];
      setPendingFiles([]);
      onPhotosChange([...existingPhotos, ...urls]);
      return urls;
    } catch {
      setUploadError("Netværksfejl — prøv igen");
      return [];
    } finally {
      setUploading(false);
    }
  }

  // Expose uploadPending via ref-like pattern (imperatively called by parent)
  // We attach it to the DOM node via a custom property so parent can call it
  return (
    <div data-photo-uploader="true">
      {/* Hidden helper to let parent trigger upload */}
      <input
        type="hidden"
        data-pending-count={pendingFiles.length}
        ref={(el) => {
          if (el) {
            (el as HTMLInputElement & { uploadPending?: (id: string) => Promise<string[]> }).uploadPending =
              uploadPending;
          }
        }}
      />

      {/* Photo grid */}
      {(existingPhotos.length > 0 || pendingFiles.length > 0) && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {existingPhotos.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeExisting(url)}
                className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white transition-all group-hover:flex"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {pendingFiles.map((file, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white">Ikke uploadet</span>
              </div>
              <button
                type="button"
                onClick={() => removePending(i)}
                className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white transition-all group-hover:flex"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileChange}
          />
          <span className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Tilføj billeder
          </span>
        </label>

        {pendingFiles.length > 0 && deviceId && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => uploadPending(deviceId)}
            className="inline-flex items-center gap-2 rounded-lg bg-green-eco px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Uploader…
              </>
            ) : (
              <>Upload {pendingFiles.length} billede{pendingFiles.length !== 1 ? "r" : ""}</>
            )}
          </button>
        )}

        {pendingFiles.length > 0 && !deviceId && (
          <p className="text-xs text-stone-400">
            {pendingFiles.length} billede{pendingFiles.length !== 1 ? "r" : ""} klar til upload efter registrering
          </p>
        )}
      </div>

      {uploadError && (
        <p className="mt-2 text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
