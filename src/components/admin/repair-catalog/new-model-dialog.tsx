"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/admin/varer/modal";
import type { ManageBrandNode, ManageTreeResponse } from "@/lib/repairs/catalog-manage-types";
import { MANAGE, api, uploadImage } from "./api";
import { ErrorNote, btnPrimary, btnSecondary, inputCls } from "./ui";

/**
 * Ny model. Oprettes som inaktiv: den vises først på hjemmesiden og i Ny sag, når der er aktive reparationer
 * med pris, og du har aktiveret modellen. Serien foreslås af den faste regel (repair_series_for).
 */
export function NewModelDialog({
  tree,
  defaultBrandId,
  onClose,
  onCreated,
}: {
  tree: ManageTreeResponse;
  defaultBrandId: string | null;
  onClose: () => void;
  onCreated: (modelId: string) => void;
}) {
  const brands = useMemo(() => tree.parents.flatMap((p) => p.brands), [tree]);
  const [brandId, setBrandId] = useState(defaultBrandId ?? brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const [series, setSeries] = useState("");
  const [seriesTouched, setSeriesTouched] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const brand: ManageBrandNode | undefined = brands.find((b) => b.id === brandId);
  const existingSeries = brand?.series.map((s) => s.name).filter((n) => n !== "Øvrige") ?? [];

  useEffect(() => {
    setSuggestion(null);
    if (!brandId || name.trim().length < 3) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await api<{ series: string | null }>(
          `${MANAGE}/series-suggestion?brand_id=${encodeURIComponent(brandId)}&name=${encodeURIComponent(name.trim())}`,
        );
        if (mine !== seq.current) return;
        setSuggestion(res.series);
        if (res.series && !seriesTouched) setSeries(res.series);
      } catch {
        /* forslaget er en hjælp; fejl ignoreres */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [brandId, name, seriesTouched]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImageUrl(await uploadImage(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    if (name.trim().length < 2) {
      setError("Skriv et modelnavn");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string }>(`${MANAGE}/models`, {
        body: { name: name.trim(), brand_id: brandId, series: series.trim() || null, image_url: imageUrl },
      });
      onCreated(created.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Ny model"
      width={520}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Annullér
          </button>
          <button type="button" className={btnPrimary} onClick={create} disabled={busy || uploading || !brandId}>
            {busy ? "Opretter..." : "Opret model"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 text-[14px]">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Mærke</span>
          <select className={inputCls} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            {tree.parents.map((p) =>
              p.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name === p.name ? b.name : `${p.name}: ${b.name}`}
                </option>
              )),
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Modelnavn</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="fx iPhone 18 Pro" autoFocus />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Serie</span>
          <input
            className={inputCls}
            list="new-model-series"
            value={series}
            onChange={(e) => {
              setSeries(e.target.value);
              setSeriesTouched(true);
            }}
            placeholder="fx iPhone 18"
          />
          <datalist id="new-model-series">
            {existingSeries.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {suggestion && suggestion !== series && (
            <button type="button" className="self-start text-[13px] text-[#1A3D2E] underline" onClick={() => setSeries(suggestion)}>
              Brug foreslået serie: {suggestion}
            </button>
          )}
          <span className="text-[13px] text-[#5E6A63]">Tom serie udfyldes automatisk, hvis navnet passer til en fast regel.</span>
        </label>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Billede (valgfrit)</span>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-[#E2E5E0] bg-[#F5F6F4]">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[11px] text-[#8A958E]">Intet</span>
              )}
            </div>
            <label className={`${btnSecondary} cursor-pointer`}>
              {uploading ? "Uploader..." : imageUrl ? "Skift billede" : "Vælg billede"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>
        <p className="rounded-lg bg-[#F5F6F4] px-3 py-2 text-[13px] text-[#3D4842]">
          Modellen oprettes <strong>skjult</strong>. Den vises først på hjemmesiden og i Ny sag, når du har sat priser på reparationerne og aktiveret modellen.
        </p>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Modal>
  );
}
