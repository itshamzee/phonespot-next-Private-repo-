"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PRICE_RANGES } from "@/lib/tilbehoer-filters";

interface FilterSidebarProps {
  brands: { name: string; count: number }[];
}

export function FilterSidebar({ brands }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePrices = searchParams.get("pris")?.split(",") ?? [];
  const activeBrands = searchParams.get("brand")?.split(",") ?? [];

  const updateParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("side");

      if (values.length === 0) {
        params.delete(key);
      } else {
        params.set(key, values.join(","));
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const togglePrice = (value: string) => {
    const next = activePrices.includes(value)
      ? activePrices.filter((v) => v !== value)
      : [...activePrices, value];
    updateParam("pris", next);
  };

  const toggleBrand = (value: string) => {
    const lower = value.toLowerCase();
    const next = activeBrands.includes(lower)
      ? activeBrands.filter((v) => v !== lower)
      : [...activeBrands, lower];
    updateParam("brand", next);
  };

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <div className="sticky top-8 space-y-6">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-charcoal">
            Pris
          </h3>
          <div className="mt-3 space-y-2">
            {PRICE_RANGES.map((range) => (
              <label
                key={range.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80"
              >
                <input
                  type="checkbox"
                  checked={activePrices.includes(range.value)}
                  onChange={() => togglePrice(range.value)}
                  className="h-4 w-4 rounded border-sand text-green-eco focus:ring-green-eco"
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>

        {brands.length > 0 && (
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-charcoal">
              Mærke
            </h3>
            <div className="mt-3 space-y-2">
              {brands.map((brand) => (
                <label
                  key={brand.name}
                  className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80"
                >
                  <input
                    type="checkbox"
                    checked={activeBrands.includes(brand.name.toLowerCase())}
                    onChange={() => toggleBrand(brand.name)}
                    className="h-4 w-4 rounded border-sand text-green-eco focus:ring-green-eco"
                  />
                  {brand.name}
                  <span className="ml-auto text-xs text-gray">({brand.count})</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
