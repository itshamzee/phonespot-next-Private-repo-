"use client";

import { useState, useMemo } from "react";
import type { PreviewItem } from "@/lib/foxway/sync";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportPreviewProps {
  items: PreviewItem[];
  onPriceChange: (sourceSku: string, newPriceOere: number) => void;
}

type StatusFilter = "all" | "new" | "updated" | "delisted";
type SortKey = "model" | "grade" | "buyPrice" | "sellPrice" | "margin" | "stock" | "status";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK").format(oere / 100) + " kr.";
}

function formatSpecs(item: PreviewItem): string {
  const parts = [item.processor, item.ram, item.storage, item.screenSize].filter(Boolean);
  return parts.join(" \u00B7 ");
}

const GRADE_STYLES: Record<string, string> = {
  N: "bg-blue-100 text-blue-700",
  P: "bg-indigo-100 text-indigo-700",
  A: "bg-green-100 text-green-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-stone-100 text-stone-500",
};

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  new: { bg: "bg-emerald-100 text-emerald-700", label: "Ny" },
  updated: { bg: "bg-amber-100 text-amber-700", label: "Opdateret" },
  unchanged: { bg: "bg-stone-100 text-stone-500", label: "Uaendret" },
  delisted: { bg: "bg-red-100 text-red-700", label: "Fjernet" },
};

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "new", label: "Nye" },
  { key: "updated", label: "Opdaterede" },
  { key: "delisted", label: "Fjernede" },
];

function computeMargin(buy: number, sell: number): number {
  if (buy <= 0) return 0;
  return ((sell - buy) / sell) * 100;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FoxwayImportPreview({ items, onPriceChange }: ImportPreviewProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("model");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") {
      list = items.filter((i) => i.status === filter);
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "model":
          cmp = a.templateName.localeCompare(b.templateName, "da");
          break;
        case "grade":
          cmp = a.grade.localeCompare(b.grade);
          break;
        case "buyPrice":
          cmp = a.buyPrice - b.buyPrice;
          break;
        case "sellPrice":
          cmp = a.sellPrice - b.sellPrice;
          break;
        case "margin":
          cmp = computeMargin(a.buyPrice, a.sellPrice) - computeMargin(b.buyPrice, b.sellPrice);
          break;
        case "stock":
          cmp = a.stock - b.stock;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [items, filter, sortKey, sortDir]);

  function SortHeader({ label, column }: { label: string; column: SortKey }) {
    const active = sortKey === column;
    return (
      <th
        className="cursor-pointer select-none whitespace-nowrap border-b border-stone-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 hover:text-stone-800"
        onClick={() => handleSort(column)}
      >
        {label}
        {active && (
          <span className="ml-1 text-stone-400">
            {sortDir === "asc" ? "\u2191" : "\u2193"}
          </span>
        )}
      </th>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-black/[0.04] bg-white p-1 shadow-sm">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? items.length
                : items.filter((i) => i.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all ${
                  filter === tab.key
                    ? "bg-charcoal text-white shadow-sm"
                    : "text-charcoal/40 hover:text-charcoal/60"
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
        <p className="text-sm text-stone-400">
          Viser {filtered.length} af {items.length}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50">
              <SortHeader label="Model" column="model" />
              <th className="whitespace-nowrap border-b border-stone-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Specs
              </th>
              <SortHeader label="Grade" column="grade" />
              <th className="whitespace-nowrap border-b border-stone-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Foxway stand
              </th>
              <SortHeader label="Koebspris" column="buyPrice" />
              <SortHeader label="Salgspris" column="sellPrice" />
              <SortHeader label="Margin" column="margin" />
              <SortHeader label="Lager" column="stock" />
              <SortHeader label="Status" column="status" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const margin = computeMargin(item.buyPrice, item.sellPrice);
              const status = STATUS_STYLES[item.status];
              const gradeStyle = GRADE_STYLES[item.grade] ?? GRADE_STYLES.C;

              return (
                <tr
                  key={item.sourceSku}
                  className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                >
                  {/* Model */}
                  <td className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 font-medium text-stone-800">
                    {item.templateName || item.sourceSku}
                  </td>

                  {/* Specs */}
                  <td className="max-w-[220px] truncate whitespace-nowrap px-3 py-2 text-xs text-stone-500">
                    {formatSpecs(item)}
                  </td>

                  {/* Grade */}
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${gradeStyle}`}
                    >
                      {item.grade}
                    </span>
                  </td>

                  {/* Foxway condition */}
                  <td className="max-w-[120px] truncate whitespace-nowrap px-3 py-2 text-xs text-stone-400">
                    {item.description
                      ? item.description.split("/").slice(-3).join("/")
                      : "-"}
                  </td>

                  {/* Buy price */}
                  <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                    {formatDKK(item.buyPrice)}
                  </td>

                  {/* Sell price (editable) */}
                  <td className="whitespace-nowrap px-3 py-2">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-stone-200 px-2 py-1 text-sm text-stone-800 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      value={Math.round(item.sellPrice / 100)}
                      onChange={(e) => {
                        const dkk = parseInt(e.target.value, 10);
                        if (!isNaN(dkk)) {
                          onPriceChange(item.sourceSku, dkk * 100);
                        }
                      }}
                      min={0}
                    />
                  </td>

                  {/* Margin % */}
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${
                      margin < 25 ? "text-red-600" : "text-stone-600"
                    }`}
                  >
                    {margin.toFixed(1)}%
                  </td>

                  {/* Stock */}
                  <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                    {item.stock}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${status?.bg ?? ""}`}
                    >
                      {status?.label ?? item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-stone-400">
                  Ingen produkter matcher filteret
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
