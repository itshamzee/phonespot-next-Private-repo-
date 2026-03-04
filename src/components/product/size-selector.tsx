"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SizeSelectorProps = {
  sizes: string[];
  selectedSize: string;
};

export function SizeSelector({ sizes, selectedSize }: SizeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = useCallback(
    (size: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("size", size);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (sizes.length <= 1) return null;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-charcoal">Størrelse</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = size === selectedSize;
          return (
            <button
              key={size}
              type="button"
              onClick={() => handleSelect(size)}
              className={`rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                isSelected
                  ? "border-green-eco bg-green-pale text-charcoal"
                  : "border-soft-grey bg-white text-charcoal hover:border-green-eco/40"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
