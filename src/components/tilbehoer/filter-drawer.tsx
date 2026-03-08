"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PRICE_RANGES } from "@/lib/tilbehoer-filters";

interface FilterDrawerProps {
  brands: { name: string; count: number }[];
  totalCount: number;
}

export function FilterDrawer({ brands, totalCount }: FilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePrices = searchParams.get("pris")?.split(",") ?? [];
  const activeBrands = searchParams.get("brand")?.split(",") ?? [];
  const hasActiveFilters = activePrices.length > 0 || activeBrands.length > 0;

  const [pendingPrices, setPendingPrices] = useState(activePrices);
  const [pendingBrands, setPendingBrands] = useState(activeBrands);

  const openDrawer = () => {
    setPendingPrices(activePrices);
    setPendingBrands(activeBrands);
    setIsOpen(true);
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("side");

    if (pendingPrices.length === 0) {
      params.delete("pris");
    } else {
      params.set("pris", pendingPrices.join(","));
    }

    if (pendingBrands.length === 0) {
      params.delete("brand");
    } else {
      params.set("brand", pendingBrands.join(","));
    }

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    setIsOpen(false);
  }, [router, pathname, searchParams, pendingPrices, pendingBrands]);

  return (
    <>
      <button
        onClick={openDrawer}
        className="flex items-center gap-2 rounded-lg border border-sand bg-white px-4 py-2 text-sm font-medium text-charcoal lg:hidden"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
        </svg>
        Filter
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">
            {activePrices.length + activeBrands.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-sand/60 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-charcoal">Filter</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray hover:text-charcoal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-charcoal">Pris</h3>
                <div className="mt-3 space-y-3">
                  {PRICE_RANGES.map((range) => (
                    <label key={range.value} className="flex cursor-pointer items-center gap-3 text-sm text-charcoal/80">
                      <input
                        type="checkbox"
                        checked={pendingPrices.includes(range.value)}
                        onChange={() =>
                          setPendingPrices((prev) =>
                            prev.includes(range.value)
                              ? prev.filter((v) => v !== range.value)
                              : [...prev, range.value],
                          )
                        }
                        className="h-5 w-5 rounded border-sand text-green-eco focus:ring-green-eco"
                      />
                      {range.label}
                    </label>
                  ))}
                </div>
              </div>

              {brands.length > 0 && (
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-charcoal">Mærke</h3>
                  <div className="mt-3 space-y-3">
                    {brands.map((brand) => (
                      <label key={brand.name} className="flex cursor-pointer items-center gap-3 text-sm text-charcoal/80">
                        <input
                          type="checkbox"
                          checked={pendingBrands.includes(brand.name.toLowerCase())}
                          onChange={() => {
                            const lower = brand.name.toLowerCase();
                            setPendingBrands((prev) =>
                              prev.includes(lower)
                                ? prev.filter((v) => v !== lower)
                                : [...prev, lower],
                            );
                          }}
                          className="h-5 w-5 rounded border-sand text-green-eco focus:ring-green-eco"
                        />
                        {brand.name}
                        <span className="ml-auto text-xs text-gray">({brand.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-sand/60 px-5 py-4">
              <button
                onClick={applyFilters}
                className="w-full rounded-xl bg-green-eco py-3 text-sm font-bold text-white transition-colors hover:bg-green-eco/90"
              >
                Vis {totalCount} resultater
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
