"use client";

import { storeLabel, type StoreId } from "@/lib/stores";
import { STORE_DOT } from "@/components/admin/StoreBadge";

export type StoreFilterValue = StoreId | "alle" | "generel";

/** Fast rækkefølge jf. spec: Alle | Slagelse | Vejle | Generel. */
const TABS: StoreFilterValue[] = ["alle", "slagelse", "vejle", "generel"];

/** Sand hvis en række med den givne (normaliserede) butik skal vises under filteret. */
export function matchesStoreFilter(value: StoreFilterValue, store: StoreId | null): boolean {
  if (value === "alle") return true;
  if (value === "generel") return store === null;
  return store === value;
}

interface StoreFilterProps {
  value: StoreFilterValue;
  onChange: (value: StoreFilterValue) => void;
  /** Antal per fane — beregnet EFTER sidens øvrige filtre, så tallene svarer til det man ser. */
  counts: Record<StoreFilterValue, number>;
  className?: string;
}

export default function StoreFilter({ value, onChange, counts, className = "" }: StoreFilterProps) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 ${className}`}>
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
            value === tab
              ? "bg-charcoal text-white shadow-sm"
              : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
          }`}
        >
          {tab !== "alle" && (
            <span className={`h-2 w-2 rounded-full ${STORE_DOT[tab]}`} />
          )}
          {tab === "alle" ? "Alle" : tab === "generel" ? "Generel" : storeLabel(tab)}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              value === tab ? "bg-white/20 text-white" : "bg-charcoal/[0.04] text-charcoal/30"
            }`}
          >
            {counts[tab]}
          </span>
        </button>
      ))}
    </div>
  );
}
