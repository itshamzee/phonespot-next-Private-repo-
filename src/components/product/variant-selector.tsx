"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { ProductVariant } from "@/lib/shopify/types";

type VariantSelectorProps = {
  variants: ProductVariant[];
  options: { name: string; values: string[] }[];
};

export function VariantSelector({ variants, options }: VariantSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleOptionChange = useCallback(
    (optionName: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const key = optionName.toLowerCase();
      params.set(key, value);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Determine which variant options are available based on current selections
  const isOptionAvailable = useCallback(
    (optionName: string, value: string) => {
      // Build a map of current selections
      const currentSelections: Record<string, string> = {};
      for (const opt of options) {
        const key = opt.name.toLowerCase();
        const param = searchParams.get(key);
        if (param) {
          currentSelections[opt.name] = param;
        }
      }

      // Check if any variant with this option value is available
      return variants.some(
        (variant) =>
          variant.availableForSale &&
          variant.selectedOptions.some(
            (so) => so.name === optionName && so.value === value,
          ),
      );
    },
    [variants, options, searchParams],
  );

  if (options.length === 0) return null;

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const currentValue = searchParams.get(option.name.toLowerCase());

        return (
          <div key={option.name}>
            <label className="mb-2 block text-sm font-medium text-charcoal">
              {option.name}
            </label>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = currentValue === value;
                const available = isOptionAvailable(option.name, value);

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleOptionChange(option.name, value)}
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
