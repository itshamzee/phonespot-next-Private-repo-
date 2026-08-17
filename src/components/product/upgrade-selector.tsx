"use client";

import { formatOere } from "@/lib/cart/utils";

export interface UpgradeOption {
  id: string;
  kind: "ram" | "ssd";
  label: string;
  targetSpec: string;
  price: number;
}

interface UpgradeSelectorProps {
  options: UpgradeOption[];
  /** Valgt option-id pr. kind; null = ingen opgradering. */
  selected: { ram: string | null; ssd: string | null };
  onChange: (kind: "ram" | "ssd", optionId: string | null) => void;
}

const KIND_LABELS: Record<"ram" | "ssd", string> = {
  ram: "Ekstra RAM (inkl. montering)",
  ssd: "Harddisk-opgradering (inkl. montering)",
};

export function UpgradeSelector({ options, selected, onChange }: UpgradeSelectorProps) {
  const kinds = (["ram", "ssd"] as const).filter((k) => options.some((o) => o.kind === k));
  if (kinds.length === 0) return null;

  const anySelected = selected.ram !== null || selected.ssd !== null;

  return (
    <div className="rounded-2xl border border-[#E5E5EA] p-4">
      <h3 className="text-sm font-semibold text-[#111111]">Tilvalg</h3>
      <div className="mt-3 space-y-3">
        {kinds.map((kind) => (
          <div key={kind} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#86868B]" htmlFor={`upgrade-${kind}`}>
              {KIND_LABELS[kind]}
            </label>
            <select
              id={`upgrade-${kind}`}
              value={selected[kind] ?? ""}
              onChange={(e) => onChange(kind, e.target.value || null)}
              className="rounded-xl border border-[#E5E5EA] bg-white px-3 py-2.5 text-sm text-[#111111] focus:border-[#1A3D2E]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
            >
              <option value="">Ingen opgradering</option>
              {options
                .filter((o) => o.kind === kind)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} (+{formatOere(o.price)})
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
      {anySelected && (
        <p className="mt-3 rounded-xl bg-[#F6F2EA] px-3 py-2.5 text-xs leading-relaxed text-[#111111]/70">
          +3 hverdages leveringstid — vi monterer og tester opgraderingen inden afsendelse
        </p>
      )}
    </div>
  );
}
