"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PRICE_RANGES } from "@/lib/tilbehoer-filters";

export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePrices = searchParams.get("pris")?.split(",") ?? [];
  const activeBrands = searchParams.get("brand")?.split(",") ?? [];
  const hasFilters = activePrices.length > 0 || activeBrands.length > 0;

  const removeFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(",") ?? [];
      const next = current.filter((v) => v !== value);

      params.delete("side");
      if (next.length === 0) {
        params.delete(key);
      } else {
        params.set(key, next.join(","));
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pris");
    params.delete("brand");
    params.delete("side");

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, pathname, searchParams]);

  if (!hasFilters) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {activePrices.map((value) => {
        const range = PRICE_RANGES.find((r) => r.value === value);
        return (
          <button
            key={`pris-${value}`}
            onClick={() => removeFilter("pris", value)}
            className="flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-charcoal transition-colors hover:bg-sand"
          >
            {range?.label ?? value}
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-gray">
              <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
            </svg>
          </button>
        );
      })}

      {activeBrands.map((brand) => (
        <button
          key={`brand-${brand}`}
          onClick={() => removeFilter("brand", brand)}
          className="flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-charcoal transition-colors hover:bg-sand"
        >
          {brand}
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-gray">
            <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
          </svg>
        </button>
      ))}

      <button onClick={clearAll} className="text-xs font-medium text-green-eco hover:underline">
        Nulstil filtre
      </button>
    </div>
  );
}
