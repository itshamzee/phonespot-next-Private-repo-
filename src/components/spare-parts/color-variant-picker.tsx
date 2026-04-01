"use client";

import { useState } from "react";

interface ColorVariant {
  color_name: string;
  color_hex: string;
  sku: string | null;
  price_dkk: number | null;
  stock: number;
  image_url: string | null;
}

interface ColorVariantPickerProps {
  variants: ColorVariant[];
  basePrice: number; // in øre
  onSelect: (variant: ColorVariant) => void;
}

export function ColorVariantPicker({
  variants,
  basePrice,
  onSelect,
}: ColorVariantPickerProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (variants.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#111111]">Farve</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v, i) => {
          const isActive = i === selectedIdx;
          const price = v.price_dkk ?? basePrice;
          return (
            <button
              key={v.color_name}
              onClick={() => {
                setSelectedIdx(i);
                onSelect(v);
              }}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                isActive
                  ? "border-[#1A3D2E] bg-[#1A3D2E]/5 font-medium text-[#111111]"
                  : "border-[#E5E5EA] bg-white text-[#86868B] hover:border-[#86868B]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full border ${
                  isActive ? "border-[#1A3D2E]" : "border-[#E5E5EA]"
                }`}
                style={{ backgroundColor: v.color_hex }}
              />
              <span>{v.color_name}</span>
              {v.price_dkk != null && v.price_dkk !== basePrice && (
                <span className="text-xs text-[#86868B]">
                  {(price / 100).toLocaleString("da-DK")} kr
                </span>
              )}
            </button>
          );
        })}
      </div>
      {variants[selectedIdx]?.stock <= 0 && (
        <p className="mt-2 text-xs text-red-500">Ikke på lager i denne farve</p>
      )}
    </div>
  );
}
