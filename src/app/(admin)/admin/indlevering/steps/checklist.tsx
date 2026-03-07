"use client";

import { useState } from "react";
import type { ChecklistStatus, ChecklistItem } from "@/lib/supabase/types";
import type { IntakeFormData } from "../page";

interface Props {
  formData: IntakeFormData;
  updateFormData: (partial: Partial<IntakeFormData>) => void;
}

const STATUS_OPTIONS: { value: ChecklistStatus; label: string; color: string }[] = [
  { value: "ok", label: "OK", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "fejl", label: "Fejl", color: "bg-red-100 text-red-800 border-red-300" },
  { value: "ikke_relevant", label: "N/A", color: "bg-gray-100 text-gray-600 border-gray-300" },
];

export function Checklist({ formData, updateFormData }: Props) {
  const [uploading, setUploading] = useState<number | "photos" | null>(null);

  function updateItem(index: number, partial: Partial<ChecklistItem>) {
    const updated = [...formData.checklist];
    updated[index] = { ...updated[index], ...partial };
    updateFormData({ checklist: updated });
  }

  async function uploadPhoto(index: number, file: File) {
    setUploading(index);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "checklist");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        updateItem(index, { photo_url: url });
      }
    } catch {
      // ignore
    }
    setUploading(null);
  }

  async function uploadIntakePhoto(file: File) {
    setUploading("photos");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "intake");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        updateFormData({ intakePhotos: [...formData.intakePhotos, url] });
      }
    } catch {
      // ignore
    }
    setUploading(null);
  }

  function removeIntakePhoto(index: number) {
    updateFormData({
      intakePhotos: formData.intakePhotos.filter((_, i) => i !== index),
    });
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-4 font-semibold text-charcoal">
          Tilstandstjekliste
        </h3>
        <div className="grid gap-4">
          {formData.checklist.map((item, i) => (
            <div
              key={item.label}
              className={`rounded-xl border p-4 ${
                item.status === "fejl" ? "border-red-200 bg-red-50/50" : "border-soft-grey"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-charcoal">
                  {item.label}
                </span>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateItem(i, { status: opt.value })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        item.status === opt.value
                          ? opt.color
                          : "border-soft-grey bg-white text-gray hover:bg-sand"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => updateItem(i, { note: e.target.value })}
                  placeholder="Note..."
                  className="min-w-0 flex-1 rounded-lg border border-soft-grey bg-white px-3 py-2 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none"
                />
                <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-soft-grey px-3 py-2 text-sm text-gray hover:bg-sand">
                  {uploading === i ? (
                    "Uploader..."
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      Foto
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(i, file);
                    }}
                  />
                </label>
              </div>

              {item.photo_url && (
                <div className="mt-2">
                  <img
                    src={item.photo_url}
                    alt={`Foto: ${item.label}`}
                    className="h-20 w-20 rounded-lg border border-soft-grey object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* General intake photos */}
      <div className="rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-4 font-semibold text-charcoal">
          Check-in fotos
        </h3>
        <div className="flex flex-wrap gap-3">
          {formData.intakePhotos.map((url, i) => (
            <div key={url} className="group relative">
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-24 w-24 rounded-lg border border-soft-grey object-cover"
              />
              <button
                type="button"
                onClick={() => removeIntakePhoto(i)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                X
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-soft-grey text-gray hover:border-green-eco hover:text-green-eco">
            {uploading === "photos" ? (
              <span className="text-xs">...</span>
            ) : (
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadIntakePhoto(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
