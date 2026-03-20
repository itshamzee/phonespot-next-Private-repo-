"use client";

import { useState, useEffect, useCallback } from "react";

interface Location {
  id: string;
  name: string;
}

interface SummaryRow {
  templateId: string;
  templateName: string;
  counts: Record<string, number>;
  total: number;
}

interface SummaryData {
  locations: Location[];
  rows: SummaryRow[];
  locationTotals: Record<string, number>;
  grandTotal: number;
}

interface StockSummaryTableProps {
  category?: string;
}

export function StockSummaryTable({ category }: StockSummaryTableProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const res = await fetch(`/api/platform/stock-summary?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente lageroverblik");
      const json: SummaryData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Model
                </th>
                {[1, 2, 3].map((i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="mx-auto h-3 w-16 animate-pulse rounded bg-stone-200" />
                  </th>
                ))}
                <th className="px-4 py-3">
                  <div className="mx-auto h-3 w-12 animate-pulse rounded bg-stone-200" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-stone-100 animate-pulse">
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 rounded bg-stone-100" />
                  </td>
                  {[1, 2, 3].map((j) => (
                    <td key={j} className="px-4 py-3 text-center">
                      <div className="mx-auto h-4 w-6 rounded bg-stone-100" />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <div className="mx-auto h-4 w-6 rounded bg-stone-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
            <svg
              className="h-7 w-7 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-stone-600">Ingen enheder på lager</p>
          <p className="mt-1 text-xs text-stone-400">
            Der er ingen enheder med status modtaget, graderet eller til salg
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Model
              </th>
              {data.locations.map((loc) => (
                <th
                  key={loc.id}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  {loc.name}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr
                key={row.templateId}
                className={[
                  "transition hover:bg-stone-50",
                  i < data.rows.length - 1 ? "border-b border-stone-100" : "",
                ].join(" ")}
              >
                <td className="px-4 py-3 font-medium text-stone-800">
                  {row.templateName}
                </td>
                {data.locations.map((loc) => {
                  const count = row.counts[loc.id] ?? 0;
                  return (
                    <td
                      key={loc.id}
                      className="px-4 py-3 text-center tabular-nums"
                    >
                      {count > 0 ? (
                        <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md bg-green-eco/10 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                          {count}
                        </span>
                      ) : (
                        <span className="text-stone-300">0</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md bg-charcoal/5 px-1.5 py-0.5 text-xs font-bold text-stone-700">
                    {row.total}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-200 bg-stone-50 font-semibold">
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-stone-500">
                Total
              </td>
              {data.locations.map((loc) => (
                <td
                  key={loc.id}
                  className="px-4 py-3 text-center tabular-nums text-stone-700"
                >
                  {data.locationTotals[loc.id] ?? 0}
                </td>
              ))}
              <td className="px-4 py-3 text-center">
                <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md bg-charcoal/10 px-2 py-0.5 text-xs font-bold text-stone-800">
                  {data.grandTotal}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
