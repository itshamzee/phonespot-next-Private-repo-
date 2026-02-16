"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const SORT_OPTIONS = [
  { label: "Bestsellere", value: "BEST_SELLING" },
  { label: "Pris: Lav \u2192 H\u00f8j", value: "PRICE" },
  { label: "Pris: H\u00f8j \u2192 Lav", value: "PRICE_DESC" },
  { label: "Nyeste", value: "CREATED" },
  { label: "Navn A-Z", value: "TITLE" },
] as const;

export function SortSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "BEST_SELLING";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const params = new URLSearchParams(searchParams.toString());

      if (value === "BEST_SELLING") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="border-sand rounded-lg bg-white px-4 py-2 text-sm font-body text-charcoal"
      aria-label="Sorter produkter"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
