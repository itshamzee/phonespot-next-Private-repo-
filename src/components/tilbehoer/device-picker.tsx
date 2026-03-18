"use client";

import { useState } from "react";
import {
  DEVICE_BRANDS,
  getDevicesByBrand,
  type DeviceBrand,
} from "@/lib/tilbehoer-config";

// Exclude tablets from the picker
const TABLET_SLUG_PATTERNS = ["ipad", "tab-s", "matepad"];
function isPhone(slug: string): boolean {
  return !TABLET_SLUG_PATTERNS.some((p) => slug.includes(p));
}

export interface DevicePickerProps {
  selectedModel: string;
  onChange: (model: string) => void;
  compact?: boolean;
}

export function DevicePicker({
  selectedModel,
  onChange,
  compact = false,
}: DevicePickerProps) {
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null);

  const models = selectedBrand
    ? getDevicesByBrand(selectedBrand).filter((d) => isPhone(d.slug))
    : [];

  function handleBrandClick(brand: DeviceBrand) {
    setSelectedBrand((prev) => (prev === brand ? null : brand));
    if (selectedBrand !== brand) onChange("");
  }

  function handleModelClick(label: string) {
    onChange(selectedModel === label ? "" : label);
  }

  function handleClear() {
    setSelectedBrand(null);
    onChange("");
  }

  const chipBase = compact
    ? "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
    : "rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Brand chips */}
      <div className="flex flex-wrap gap-2">
        {DEVICE_BRANDS.map((b) => (
          <button
            key={b.slug}
            onClick={() => handleBrandClick(b.slug)}
            className={`${chipBase} ${
              selectedBrand === b.slug
                ? "bg-charcoal text-white"
                : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {b.label}
          </button>
        ))}
        {selectedModel && (
          <button
            onClick={handleClear}
            className={`${chipBase} border border-white/20 text-white/60 hover:text-white`}
          >
            ✕ Ryd
          </button>
        )}
      </div>

      {/* Model chips */}
      {models.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {models.map((d) => (
            <button
              key={d.slug}
              onClick={() => handleModelClick(d.label)}
              className={`${chipBase} ${
                selectedModel === d.label
                  ? "bg-green-eco text-white"
                  : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Hint when no brand selected */}
      {!selectedBrand && (
        <p className={`${compact ? "text-xs" : "text-sm"} text-white/40`}>
          Vælg et mærke for at se modeller
        </p>
      )}
    </div>
  );
}
