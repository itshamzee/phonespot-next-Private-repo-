"use client";

import { useState } from "react";
import Link from "next/link";
import { ValuationSummary } from "@/components/platform/valuation-summary";
import { LowStockBanner } from "@/components/platform/low-stock-banner";
import { StockFilters, type StockFilters as StockFiltersType } from "@/components/platform/stock-filters";
import { StockTable } from "@/components/platform/stock-table";

export default function StockPage() {
  const [filters, setFilters] = useState<StockFiltersType>({});

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Lagerstyring</h1>
          <p className="mt-1 text-sm text-stone-400">
            Overblik over enheder, værdier og lokationer
          </p>
        </div>

        {/* Quick link to accessory management */}
        <Link
          href="/admin/platform/sku"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
        >
          <svg
            className="h-4 w-4 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          Tilbehørslager
        </Link>
      </div>

      {/* Valuation summary cards */}
      <section aria-label="Lagerværdi">
        <ValuationSummary />
      </section>

      {/* Low stock warning */}
      <LowStockBanner />

      {/* Filters + table */}
      <section aria-label="Enhedsoversigt" className="space-y-3">
        <StockFilters filters={filters} onChange={setFilters} />
        <StockTable filters={filters} />
      </section>
    </div>
  );
}
