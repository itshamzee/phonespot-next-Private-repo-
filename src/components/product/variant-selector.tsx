"use client";

import { useMemo } from "react";
import type { ProductVariant } from "@/lib/shopify/types";

type VariantSelectorProps = {
  variants: ProductVariant[];
  options: { name: string; values: string[] }[];
  onOptionChange?: (optionName: string, value: string) => void;
  selectedOptions?: Record<string, string>;
};

export function VariantSelector({ variants, options, onOptionChange, selectedOptions }: VariantSelectorProps) {
  // Determine which variant options are available
  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const opt of options) {
      for (const value of opt.values) {
        const key = `${opt.name}:${value}`;
        const available = variants.some(
          (variant) =>
            variant.availableForSale &&
            variant.selectedOptions.some(
              (so) => so.name === opt.name && so.value === value,
            ),
        );
        map.set(key, available);
      }
    }
    return map;
  }, [variants, options]);

  if (options.length === 0) return null;

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const currentValue = selectedOptions?.[option.name.toLowerCase()] ?? "";

        return (
          <div key={option.name}>
            <label className="mb-2 block text-sm font-medium text-charcoal">
              {option.name}
            </label>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = currentValue === value;
                const available = availabilityMap.get(`${option.name}:${value}`) ?? false;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onOptionChange?.(option.name, value)}
                    disabled={!available}
                    className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                      isSelected
                        ? "border-green-eco bg-green-pale font-medium text-green-eco"
                        : available
                          ? "border-sand text-charcoal hover:border-charcoal/30"
                          : "border-sand/50 text-gray/50 cursor-not-allowed"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
