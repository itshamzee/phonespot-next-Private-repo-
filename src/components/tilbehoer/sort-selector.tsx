"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SORT_OPTIONS = [
  { label: "Bestsellere", value: "bestselling" },
  { label: "Pris: Lav → Høj", value: "price-asc" },
  { label: "Pris: Høj → Lav", value: "price-desc" },
  { label: "Nyeste", value: "newest" },
] as const;

export function TilbehoerSortSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "bestselling";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("side");

      if (value === "bestselling") {
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
      className="rounded-lg border border-sand bg-white px-4 py-2 text-sm font-body text-charcoal"
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
