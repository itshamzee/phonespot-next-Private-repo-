"use client";

import { useState } from "react";
import Link from "next/link";
import { ValuationSummary } from "@/components/platform/valuation-summary";
import { LowStockBanner } from "@/components/platform/low-stock-banner";
import { StockFilters, type StockFilters as StockFiltersType } from "@/components/platform/stock-filters";
import { StockTable } from "@/components/platform/stock-table";
import { StockSummaryTable } from "@/components/platform/stock-summary-table";

const CATEGORY_TABS = [
  { value: "", label: "Alle", icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ) },
  { value: "iphone", label: "iPhones", icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ) },
  { value: "smartphone", label: "Smartphones", icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ) },
  { value: "ipad", label: "iPads", icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ) },
  { value: "laptop", label: "Bærbare", icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  ) },
  { value: "smartwatch", label: "Ure", icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) },
];

type ViewMode = "devices" | "summary";

export default function StockPage() {
  const [filters, setFilters] = useState<StockFiltersType>({});
  const [view, setView] = useState<ViewMode>("devices");

  function setCategory(category: string) {
    setFilters((prev) => ({ ...prev, category: category || undefined }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Lagerstyring
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Overblik over enheder, værdier og lokationer
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/platform/sku"
            className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm font-semibold text-charcoal/60 shadow-sm transition-all hover:border-charcoal/20 hover:text-charcoal"
          >
            <svg className="h-4 w-4 text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Tilbehør
          </Link>
          <Link
            href="/admin/platform/intake"
            className="flex items-center gap-2 rounded-xl bg-green-eco px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj enhed
          </Link>
        </div>
      </div>

      <section aria-label="Lagerværdi">
        <ValuationSummary />
      </section>

      <LowStockBanner />

      {/* View toggle + Category tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => {
            const isActive = (filters.category ?? "") === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCategory(tab.value)}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all",
                  isActive
                    ? "bg-charcoal text-white shadow-sm"
                    : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 hover:border-charcoal/10 shadow-sm",
                ].join(" ")}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle */}
        <div className="flex shrink-0 items-center rounded-xl border border-stone-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setView("devices")}
            className={[
              "rounded-[10px] px-3 py-2 text-xs font-semibold transition-all",
              view === "devices"
                ? "bg-charcoal text-white shadow-sm"
                : "text-stone-400 hover:text-stone-600",
            ].join(" ")}
          >
            Enheder
          </button>
          <button
            type="button"
            onClick={() => setView("summary")}
            className={[
              "rounded-[10px] px-3 py-2 text-xs font-semibold transition-all",
              view === "summary"
                ? "bg-charcoal text-white shadow-sm"
                : "text-stone-400 hover:text-stone-600",
            ].join(" ")}
          >
            Overblik
          </button>
        </div>
      </div>

      {view === "devices" ? (
        <section aria-label="Enhedsoversigt" className="space-y-3">
          <StockFilters filters={filters} onChange={setFilters} />
          <StockTable filters={filters} />
        </section>
      ) : (
        <section aria-label="Lageroverblik">
          <StockSummaryTable category={filters.category} />
        </section>
      )}
    </div>
  );
}
