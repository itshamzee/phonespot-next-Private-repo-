"use client";

import { useState } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import { formatKrShort } from "@/lib/repairs/case-money";
import { REPAIR_QUALITY_LABELS } from "@/lib/repairs/new-case-types";
import { stockInfo, type CatalogService, type FreeTask, type LocationSlug, type ServiceCategory } from "./logic";
import { Chip, focusRing, inputClass, labelClass } from "./section-card";

type Props = {
  modelName: string | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  categories: ServiceCategory[];
  location: LocationSlug;
  selected: Record<string, string>;
  /** Kategorien hvis kvaliteter vises lige nu. */
  viewing: string | null;
  onChipClick: (category: ServiceCategory) => void;
  onToggleService: (category: ServiceCategory, service: CatalogService) => void;
  free: FreeTask[];
  onAddFree: (t: { description: string; price_dkk: number }) => void;
  onRemoveFree: (id: string) => void;
  onDone: () => void;
};

const toneClass = { ok: "text-[#23703F]", warn: "text-[#9A5B0A]", muted: "text-[#5E6A63]" } as const;

function minutesText(m: number | null): string | null {
  if (!m) return null;
  if (m < 60) return `ca. ${m} min.`;
  const h = m / 60;
  return Number.isInteger(h) ? `ca. ${h} t.` : `ca. ${Math.round(m)} min.`;
}

export function TierCard({ service, location, on, onClick }: { service: CatalogService; location: LocationSlug; on: boolean; onClick: () => void }) {
  const stock = stockInfo(service.part, location);
  const title = service.quality_tier ? REPAIR_QUALITY_LABELS[service.quality_tier] : service.name;
  const detail = [service.quality_label ?? (service.quality_tier ? service.name : null), minutesText(service.estimated_minutes)].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex flex-col gap-1.5 rounded-xl p-3.5 text-left ${focusRing} ${
        on ? "border-2 border-[#1A3D2E] bg-[#E7EFE9]" : "border border-[#E2E5E0] bg-white hover:bg-[#F5F6F4]"
      }`}
    >
      <span className="flex justify-between gap-2 text-[15px] font-bold">
        <span>{title}</span>
        <span className="tabular-nums">{formatKrShort(service.price_oere)}</span>
      </span>
      {detail && <span className="text-[13px] text-[#5E6A63]">{detail}</span>}
      {stock.state !== "none" && <span className={`text-[13px] font-semibold ${toneClass[stock.tone]}`}>{stock.text}</span>}
    </button>
  );
}

export function RepairSection(p: Props) {
  const [freeOpen, setFreeOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const viewing = p.categories.find((c) => c.name === p.viewing) ?? null;
  const priceNum = Number(price.replace(",", "."));
  const freeValid = desc.trim().length > 1 && Number.isFinite(priceNum) && priceNum >= 0 && price.trim() !== "";

  function addFree() {
    if (!freeValid) return;
    p.onAddFree({ description: desc.trim(), price_dkk: priceNum });
    setDesc("");
    setPrice("");
    setFreeOpen(false);
  }

  if (!p.modelName) return <p className="m-0 text-sm text-[#5E6A63]">Vælg først en enhed i trin 2.</p>;

  return (
    <>
      {p.loading && <p className="m-0 text-sm text-[#5E6A63]">Henter reparationer...</p>}
      {p.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-[#F5D9B0] bg-[#FFF4E5] px-4 py-3 text-sm text-[#8A4B08]">
          <span>{p.error}</span>
          <Btn size="sm" onClick={p.onRetry}>
            Prøv igen
          </Btn>
        </div>
      )}

      <div role="group" aria-label="Reparationstype" className="flex flex-wrap gap-2">
        {p.categories.map((c, i) => {
          const chosen = c.services.find((s) => s.id === p.selected[c.name]);
          const min = Math.min(...c.services.map((s) => s.price_oere));
          const isViewing = viewing?.name === c.name;
          return (
            <button
              key={c.name}
              type="button"
              aria-pressed={Boolean(chosen)}
              aria-expanded={isViewing}
              data-autofocus={i === 0 ? "" : undefined}
              onClick={() => p.onChipClick(c)}
              className={`h-9 rounded-full border px-3.5 text-sm ${focusRing} ${
                isViewing
                  ? "border-transparent bg-[#1A3D2E] font-semibold text-white"
                  : chosen
                    ? "border-[#1A3D2E] bg-[#E7EFE9] font-semibold text-[#1A3D2E]"
                    : "border-[#C9D0C7] bg-white hover:bg-[#F5F6F4]"
              }`}
            >
              {c.name}
              {chosen ? ` · ${formatKrShort(chosen.price_oere)}` : Number.isFinite(min) ? ` · fra ${formatKrShort(min)}` : ""}
            </button>
          );
        })}
        <Chip dashed aria-pressed={freeOpen} onClick={() => setFreeOpen((v) => !v)}>
          + Anden opgave
        </Chip>
      </div>

      {!p.loading && !p.error && p.categories.length === 0 && (
        <p className="m-0 text-sm text-[#5E6A63]">Ingen reparationer i kataloget for denne model. Brug &quot;Anden opgave&quot;.</p>
      )}

      {viewing && (
        <div role="group" aria-label={`Kvalitet: ${viewing.name}`} className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {viewing.services.map((s) => (
            <TierCard key={s.id} service={s} location={p.location} on={p.selected[viewing.name] === s.id} onClick={() => p.onToggleService(viewing, s)} />
          ))}
        </div>
      )}

      {p.free.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {p.free.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#F5F6F4] px-3 py-2">
              <span>
                {f.description} <span className="text-[#5E6A63]">· anden opgave</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{formatKrShort(Math.round(f.price_dkk * 100))}</span>
                <button type="button" aria-label={`Fjern ${f.description}`} onClick={() => p.onRemoveFree(f.id)} className={`text-[#B42318] underline ${focusRing}`}>
                  Fjern
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {freeOpen && (
        <form
          aria-label="Anden opgave"
          className="grid items-end gap-3 rounded-[10px] border border-[#E2E5E0] bg-[#FAFBF9] p-4 [grid-template-columns:2fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addFree();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setFreeOpen(false);
            }
          }}
        >
          <label className={labelClass}>
            Beskrivelse
            <input autoFocus className={inputClass} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
          <label className={labelClass}>
            Pris (kr.)
            <input inputMode="decimal" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <Btn type="submit" variant="primary" disabled={!freeValid}>
            Tilføj
          </Btn>
        </form>
      )}

      <div className="flex justify-end">
        <Btn variant="primary" onClick={p.onDone}>
          Videre til tilkøb
        </Btn>
      </div>
    </>
  );
}
