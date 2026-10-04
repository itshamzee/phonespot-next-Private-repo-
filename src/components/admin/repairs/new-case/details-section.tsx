"use client";

import { useState } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import { allNormal } from "@/lib/repairs/intake-checklist";
import { previewSrc, rememberPreview } from "@/lib/repairs/photo-preview";
import type { ChecklistItem, ChecklistStatus } from "@/lib/supabase/types";
import { uploadIntakePhoto } from "./api";
import { focusRing, inputClass, labelClass } from "./section-card";

type Props = {
  issue: string;
  onIssue: (v: string) => void;
  checklist: ChecklistItem[];
  onChecklist: (c: ChecklistItem[]) => void;
  promisedAt: string;
  onPromisedAt: (v: string) => void;
  assignedTo: string;
  onAssignedTo: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  photos: string[];
  onPhotos: (p: string[]) => void;
};

const STATUS: { value: ChecklistStatus; label: string }[] = [
  { value: "ok", label: "OK" },
  { value: "fejl", label: "Fejl" },
  { value: "ikke_relevant", label: "Ikke relevant" },
];

export function DetailsSection(p: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function setItem(i: number, patch: Partial<ChecklistItem>) {
    p.onChecklist(p.checklist.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function onFile(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const { url, path } = await uploadIntakePhoto(file, "intake");
      rememberPreview(path, url);
      p.onPhotos([...p.photos, path]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Fotoet kunne ikke uploades.");
    }
    setUploading(false);
  }

  return (
    <>
      <label className={labelClass}>
        Fejlbeskrivelse
        <textarea
          data-autofocus
          rows={2}
          className={`${inputClass} h-auto py-2`}
          placeholder="Hvad er der galt, ifølge kunden?"
          value={p.issue}
          onChange={(e) => p.onIssue(e.target.value)}
        />
      </label>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <label className={labelClass}>
          Lovet klar
          <input type="datetime-local" className={inputClass} value={p.promisedAt} onChange={(e) => p.onPromisedAt(e.target.value)} />
        </label>
        <label className={labelClass}>
          Ansvarlig
          <input className={inputClass} value={p.assignedTo} onChange={(e) => p.onAssignedTo(e.target.value)} autoComplete="off" />
        </label>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-1 flex w-full items-center justify-between gap-3 p-0 text-[13px] text-[#5E6A63]">
          <span>Tilstand ved modtagelse</span>
          <Btn size="sm" onClick={() => p.onChecklist(allNormal(p.checklist))}>
            Alt som normalt
          </Btn>
        </legend>
        <p className="m-0 text-[13px] text-[#5E6A63]">Intet er forhåndsvalgt. Punkter der ikke er vurderet, står som &quot;Ikke vurderet&quot; på indleveringsbeviset.</p>
        <ul className="m-0 grid list-none gap-2 p-0 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {p.checklist.map((item, i) => (
            <li key={item.label} className={`flex flex-col gap-2 rounded-lg border p-2.5 text-sm ${item.status === "fejl" ? "border-[#F0B4AE] bg-[#FDF6F5]" : "border-[#E2E5E0]"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{item.label}</span>
                <span role="group" aria-label={item.label} className="flex gap-1">
                  {STATUS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={item.status === o.value}
                      onClick={() => setItem(i, { status: item.status === o.value ? "ikke_vurderet" : o.value })}
                      className={`h-7 rounded-md border px-2 text-xs ${focusRing} ${
                        item.status === o.value ? "border-[#1A3D2E] bg-[#E7EFE9] font-semibold text-[#1A3D2E]" : "border-[#C9D0C7] bg-white text-[#3D4842] hover:bg-[#F5F6F4]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </span>
              </div>
              {item.status === "fejl" && (
                <input aria-label={`Note: ${item.label}`} className={`${inputClass} h-9`} placeholder="Beskriv fejlen" value={item.note} onChange={(e) => setItem(i, { note: e.target.value })} />
              )}
            </li>
          ))}
        </ul>
      </fieldset>

      <label className={labelClass}>
        Interne noter
        <textarea rows={2} className={`${inputClass} h-auto py-2`} value={p.notes} onChange={(e) => p.onNotes(e.target.value)} />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-[#5E6A63]">Fotos</span>
        <div className="flex flex-wrap items-center gap-2">
          {p.photos.map((path) => (
            <span key={path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(path)} alt="Foto ved indlevering" className="h-16 w-16 rounded-lg border border-[#E2E5E0] object-cover" />
              <button
                type="button"
                aria-label="Fjern foto"
                onClick={() => p.onPhotos(p.photos.filter((x) => x !== path))}
                className={`absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-[#15211B] text-xs leading-5 text-white ${focusRing}`}
              >
                x
              </button>
            </span>
          ))}
          <label className={`inline-flex h-10 cursor-pointer items-center rounded-lg border border-[#C9D0C7] bg-white px-3.5 text-sm font-semibold hover:bg-[#F5F6F4] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2F8F55]`}>
            {uploading ? "Uploader..." : "Tilføj foto"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError && (
          <p role="alert" className="m-0 text-sm text-[#B42318]">
            {uploadError}
          </p>
        )}
      </div>
    </>
  );
}
