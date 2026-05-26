"use client";

import { BATTERY_UPGRADE } from "@/lib/campaigns/sommer-bundle";

type Props = {
  selected: boolean;
  onToggle: (next: boolean) => void;
};

export function BatteryUpgradeCard({ selected, onToggle }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sand bg-white p-3.5 shadow-sm">
      {/* 100% radial indicator */}
      <div
        aria-hidden
        className="relative h-9 w-9 shrink-0 rounded-full"
        style={{ background: "conic-gradient(#228b52 0% 100%, #e0e0e0 100% 100%)" }}
      >
        <div className="absolute inset-1 rounded-full bg-white" />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-[#228b52]">
          100%
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">
          Nyt 100% batteri{" "}
          <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-extrabold text-orange-700">
            +{(BATTERY_UPGRADE.price_oere / 100).toFixed(0)} kr
          </span>
        </p>
        <p className="mt-1 text-[11px] leading-snug text-charcoal/60">
          Vores tekniker installerer et nyt batteri inden forsendelse.
        </p>
        <span className="mt-1.5 inline-block rounded-full bg-sand/60 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
          {BATTERY_UPGRADE.shippingDelayLabel}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={selected}
        onClick={() => onToggle(!selected)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          selected ? "bg-[#228b52]" : "bg-charcoal/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            selected ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
