"use client";

import { useState } from "react";
import { formatKr, isValidPrice, parseAmount } from "@/lib/repairs/catalog-manage-rules";
import type { ManageCategory, ManageService } from "@/lib/repairs/catalog-manage-types";
import { Switch, btnSmall } from "./ui";

export type ServicePatch = {
  price_dkk?: number;
  active?: boolean;
  estimated_minutes?: number | null;
  warranty_info?: string | null;
};

const GRID = "grid grid-cols-[28px_minmax(130px,1.1fr)_104px_84px_minmax(130px,1fr)_minmax(220px,1.7fr)_74px] items-center gap-3";

/** Tekstfelt der gemmer ved Enter eller når man forlader det. Esc fortryder. Gemmer ikke, hvis intet er ændret. */
function InlineField({
  value,
  onCommit,
  label,
  suffix,
  align = "left",
  placeholder,
  invalid,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  label: string;
  suffix?: string;
  align?: "left" | "right";
  placeholder?: string;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Ny værdi fra serveren: nulstil udkastet (under render, så der ikke kommer en ekstra runde).
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (draft.trim() === value.trim()) {
      setDraft(value);
      return;
    }
    setSaving(true);
    const ok = await onCommit(draft);
    setSaving(false);
    if (!ok) setDraft(value);
  }

  return (
    <span
      className={`flex h-9 items-center rounded-lg border bg-white px-2 focus-within:ring-2 focus-within:ring-[#1A3D2E]/15 ${
        invalid ? "border-[#D9A760]" : "border-[#C9D0C7]"
      } ${saving ? "opacity-60" : ""}`}
    >
      <input
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        disabled={saving}
        inputMode={align === "right" ? "numeric" : "text"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
        className={`min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#8A958E] ${align === "right" ? "text-right tabular-nums" : ""}`}
      />
      {suffix && <span className="pl-1 text-[13px] text-[#5E6A63]">{suffix}</span>}
    </span>
  );
}

function PartCell({ service, onStock }: { service: ManageService; onStock: (partId: string) => void }) {
  const part = service.part;
  if (!part) {
    const text =
      service.part_mode === "none" ? "Bruger ingen del" : service.part_mode === "manual" ? "Del vælges i sagen" : "Ingen del koblet endnu";
    return <span className="text-[13px] text-[#5E6A63]">{text}</span>;
  }
  const byStore = (slug: string) => part.other_locations.find((o) => o.slug === slug)?.available ?? 0;
  const empty = part.tracked && byStore("vejle") === 0 && byStore("slagelse") === 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-[14px]" title={part.title ?? undefined}>
          {part.title ?? "Del"}
        </p>
        <p className={`text-[13px] ${empty ? "text-[#9A5B0A]" : "text-[#5E6A63]"}`}>
          {part.tracked ? `${byStore("vejle")} i Vejle · ${byStore("slagelse")} i Slagelse` : "Ikke optalt"}
          {part.cost_oere != null && part.cost_oere > 0 && <span className="text-[#5E6A63]"> · kost {formatKr(Math.round(part.cost_oere / 100))}</span>}
        </p>
      </div>
      <button type="button" className={btnSmall} onClick={() => onStock(part.sku_product_id)} aria-label={`Lager for ${part.title ?? "del"}`}>
        Lager
      </button>
    </div>
  );
}

/** Reparationer grupperet pr. kategori, én række pr. kvalitet (Budget, OEM, Original). */
export function ServiceTable({
  categories,
  selected,
  onSelect,
  onPatch,
  onStock,
  onError,
}: {
  categories: ManageCategory[];
  selected: Set<string>;
  onSelect: (ids: string[], on: boolean) => void;
  onPatch: (id: string, patch: ServicePatch) => Promise<boolean>;
  onStock: (partId: string) => void;
  onError: (message: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-[#E2E5E0] bg-white px-6 py-10 text-center text-[14px] text-[#5E6A63]">
        Modellen har ingen reparationer endnu. Brug &quot;Kopiér reparationer fra...&quot; for at hente dem fra en søskendemodel.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => {
        const ids = cat.services.map((s) => s.id);
        const allSelected = ids.every((id) => selected.has(id));
        return (
          <section key={cat.name} className="overflow-x-auto rounded-xl border border-[#E2E5E0] bg-white">
            <div className="min-w-[960px]">
              <div className={`${GRID} border-b border-[#E2E5E0] bg-[#F5F6F4] px-3 py-2 text-[13px] font-semibold text-[#5E6A63]`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelect(ids, e.target.checked)}
                  aria-label={`Vælg alle i ${cat.name}`}
                  className="accent-[#1A3D2E]"
                />
                <span className="text-[14px] text-[#15211B]">{cat.name}</span>
                <span className="text-right">Pris</span>
                <span className="text-right">Minutter</span>
                <span>Garanti</span>
                <span>Del og lager</span>
                <span className="text-right">Aktiv</span>
              </div>
              {cat.services.map((s) => {
                const priced = isValidPrice(s.price_dkk);
                return (
                  <div key={s.id} className={`${GRID} border-b border-[#EEF0EC] px-3 py-2.5 last:border-b-0 ${s.active ? "" : "bg-[#FAFAF8]"}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={(e) => onSelect([s.id], e.target.checked)}
                      aria-label={`Vælg ${s.name}`}
                      className="accent-[#1A3D2E]"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold">{s.quality_label ?? s.name}</p>
                      {s.quality_label && <p className="truncate text-[13px] text-[#5E6A63]" title={s.name}>{s.name}</p>}
                    </div>
                    <InlineField
                      label={`Pris for ${s.name}`}
                      value={priced ? String(s.price_dkk) : ""}
                      placeholder="Pris"
                      suffix="kr."
                      align="right"
                      invalid={!priced}
                      onCommit={async (raw) => {
                        const n = parseAmount(raw);
                        if (n === null || !isValidPrice(n)) {
                          onError("Prisen skal være et helt antal kroner over 0");
                          return false;
                        }
                        return onPatch(s.id, { price_dkk: n });
                      }}
                    />
                    <InlineField
                      label={`Minutter for ${s.name}`}
                      value={s.estimated_minutes != null ? String(s.estimated_minutes) : ""}
                      placeholder="Min."
                      align="right"
                      onCommit={async (raw) => {
                        if (raw.trim() === "") return onPatch(s.id, { estimated_minutes: null });
                        const n = parseAmount(raw);
                        if (n === null || !Number.isInteger(n) || n < 0) {
                          onError("Minutter skal være et helt tal");
                          return false;
                        }
                        return onPatch(s.id, { estimated_minutes: n });
                      }}
                    />
                    <InlineField
                      label={`Garanti for ${s.name}`}
                      value={s.warranty_info ?? ""}
                      placeholder="Garantitekst"
                      onCommit={(raw) => onPatch(s.id, { warranty_info: raw.trim() === "" ? null : raw.trim() })}
                    />
                    <PartCell service={s} onStock={onStock} />
                    <div className="flex justify-end">
                      <Switch
                        checked={s.active}
                        label={`${s.name}: vises på hjemmesiden`}
                        title={priced ? (s.active ? "Vises på hjemmesiden" : "Skjult på hjemmesiden") : "Sæt en pris over 0 kr. først"}
                        disabled={!s.active && !priced}
                        onChange={(next) => void onPatch(s.id, { active: next })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
