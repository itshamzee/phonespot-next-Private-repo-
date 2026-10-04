"use client";

import { useMemo, useState } from "react";
import { DeviceImage } from "@/components/repair/device-image";
import type { CatalogTreeResponse } from "@/lib/repairs/new-case-types";
import type { DeviceType } from "@/lib/supabase/types";
import { Btn } from "@/components/admin/repairs/ui";
import { looksLikeImei, modelsInSeries, searchModels, seriesFor, type CatalogParent, type ExistingCustomer, type ModelHit } from "./logic";
import { Chip, focusRing, inputClass, labelClass } from "./section-card";

export type SelectedModel = {
  id: string;
  name: string;
  brandName: string;
  brandSlug: string;
  deviceType: string;
  imageUrl: string | null;
};

export type DeviceFields = { serial: string; color: string; passcode: string };

type Props = {
  tree: CatalogTreeResponse | null;
  treeError: string;
  onRetry: () => void;
  model: SelectedModel | null;
  onModel: (m: SelectedModel) => void;
  fields: DeviceFields;
  onFields: (f: DeviceFields) => void;
  customer: ExistingCustomer | null;
  /** Enhedsdelen er færdig (Enter i et felt eller "Videre"). */
  onDone: () => void;
};

function toSelected(hit: ModelHit): SelectedModel {
  return {
    id: hit.model.id,
    name: hit.model.name,
    brandName: hit.brandName,
    brandSlug: hit.brandSlug,
    deviceType: hit.deviceType,
    imageUrl: hit.model.image_url,
  };
}

function ModelCard({ hit, selected, onPick }: { hit: ModelHit; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={`flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl bg-white px-2 text-sm ${focusRing} ${
        selected ? "border-2 border-[#1A3D2E] font-bold" : "border border-[#E2E5E0] hover:bg-[#F5F6F4]"
      }`}
    >
      <DeviceImage
        brandSlug={hit.brandSlug}
        deviceType={(hit.deviceType as DeviceType) ?? "smartphone"}
        imageUrl={hit.model.image_url}
        modelName={hit.model.name}
        className="h-[64px] w-[48px]"
      />
      <span className="text-center leading-tight">{hit.model.name}</span>
    </button>
  );
}

export function DeviceSection({ tree, treeError, onRetry, model, onModel, fields, onFields, customer, onDone }: Props) {
  const parents = useMemo(() => tree?.parents ?? [], [tree]);
  const [parentKey, setParentKey] = useState<string | null>(null);
  const [series, setSeries] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeParent: CatalogParent | undefined = useMemo(
    () => parents.find((p) => p.key === parentKey) ?? parents[0],
    [parents, parentKey],
  );
  const seriesList = useMemo(() => (activeParent ? seriesFor(activeParent) : []), [activeParent]);
  const activeSeries = series ?? seriesList[0]?.name ?? null;

  const searching = query.trim().length > 0 && !looksLikeImei(query);
  const hits: ModelHit[] = useMemo(() => {
    if (searching) return searchModels(parents, query);
    if (activeParent && activeSeries) return modelsInSeries(activeParent, activeSeries);
    return [];
  }, [searching, parents, query, activeParent, activeSeries]);

  const known = customer?.customer_devices ?? [];

  function pick(hit: ModelHit) {
    onModel(toSelected(hit));
    setQuery("");
    setParentKey(hit.parentKey);
    setSeries(hit.series);
  }

  function pickKnown(d: { brand: string; model: string; serial_number: string | null; color: string | null }) {
    const found = searchModels(parents, `${d.brand} ${d.model}`, 5).find((h) => h.model.name.toLowerCase() === d.model.toLowerCase()) ?? searchModels(parents, d.model, 1)[0];
    if (found) pick(found);
    onFields({ ...fields, serial: d.serial_number ?? fields.serial, color: d.color ?? fields.color });
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && query) {
      e.preventDefault();
      setQuery("");
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = query.trim();
    if (looksLikeImei(v)) {
      // Scanneren skriver IMEI og trykker Enter.
      onFields({ ...fields, serial: v });
      setQuery("");
      return;
    }
    if (hits[0]) pick(hits[0]);
  }

  const setField = (k: keyof DeviceFields) => (e: React.ChangeEvent<HTMLInputElement>) => onFields({ ...fields, [k]: e.target.value });
  const fieldKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (model) onDone();
    }
  };

  return (
    <>
      <div className="-mt-1 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-10 flex-[0_1_340px] items-center gap-2 rounded-lg border border-[#C9D0C7] px-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[#2F8F55]">
          <input
            data-autofocus
            aria-label="Søg model eller scan IMEI"
            placeholder="Søg model eller scan IMEI · fx iph 15 pro"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </label>
        {looksLikeImei(query) && <span className="text-sm text-[#5E6A63]">Tryk Enter for at bruge som IMEI</span>}
      </div>

      {known.length > 0 && !model && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#5E6A63]">Kundens enheder:</span>
          {known.map((d) => (
            <Chip key={d.id} onClick={() => pickKnown(d)}>
              {d.brand} {d.model}
            </Chip>
          ))}
        </div>
      )}

      {treeError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-[#F5D9B0] bg-[#FFF4E5] px-4 py-3 text-sm text-[#8A4B08]">
          <span>{treeError}</span>
          <Btn size="sm" onClick={onRetry}>
            Prøv igen
          </Btn>
        </div>
      )}
      {!tree && !treeError && <p className="m-0 text-sm text-[#5E6A63]">Henter kataloget...</p>}

      {!searching && parents.length > 0 && (
        <div role="group" aria-label="Mærke" className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(110px,1fr))]">
          {parents.map((p) => {
            const on = activeParent?.key === p.key;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setParentKey(p.key);
                  setSeries(null);
                }}
                className={`flex h-14 items-center justify-center gap-2 rounded-[10px] px-2 text-[15px] ${focusRing} ${
                  on ? "border-2 border-[#1A3D2E] bg-[#E7EFE9] font-bold" : "border border-[#E2E5E0] bg-white font-semibold hover:bg-[#F5F6F4]"
                }`}
              >
                {p.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo} alt="" className="h-5 w-5 object-contain" />
                )}
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {!searching && activeParent && seriesList.length > 1 && (
        <div role="group" aria-label="Serie" className="flex flex-wrap gap-2">
          {seriesList.map((s) => (
            <Chip key={s.name} active={activeSeries === s.name} onClick={() => setSeries(s.name)}>
              {s.name}
            </Chip>
          ))}
        </div>
      )}

      {(searching || activeParent) && (
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]" role="group" aria-label="Modeller">
          {hits.map((h) => (
            <ModelCard key={h.model.id} hit={h} selected={model?.id === h.model.id} onPick={() => pick(h)} />
          ))}
          {searching && hits.length === 0 && <p className="col-span-full m-0 text-sm text-[#5E6A63]">Ingen modeller matcher &quot;{query.trim()}&quot;.</p>}
        </div>
      )}

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <label className={labelClass}>
          IMEI / serienr.
          <input
            data-imei
            className={`${inputClass} tabular-nums`}
            placeholder="Scan eller skriv"
            value={fields.serial}
            onChange={setField("serial")}
            onKeyDown={fieldKey}
            autoComplete="off"
            inputMode="text"
          />
        </label>
        <label className={labelClass}>
          Farve
          <input className={inputClass} placeholder="Valgfri" value={fields.color} onChange={setField("color")} onKeyDown={fieldKey} autoComplete="off" />
        </label>
        <label className={labelClass}>
          Kode
          <input
            className={inputClass}
            placeholder="Vises kun på værkstedet"
            value={fields.passcode}
            onChange={setField("passcode")}
            onKeyDown={fieldKey}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Btn variant="primary" disabled={!model} onClick={onDone}>
          Videre til reparation
        </Btn>
      </div>
    </>
  );
}
