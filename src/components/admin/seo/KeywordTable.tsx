"use client";

import { useState } from "react";

export interface KeywordTableRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  positionChange: number | null;
}

interface KeywordTableProps {
  rows: KeywordTableRow[];
  loading: boolean;
}

type SortKey =
  | "query"
  | "clicks"
  | "impressions"
  | "ctr"
  | "position"
  | "positionChange";

const HEADERS: { key: SortKey; label: string }[] = [
  { key: "query", label: "Sogeord" },
  { key: "clicks", label: "Klik" },
  { key: "impressions", label: "Visninger" },
  { key: "ctr", label: "CTR" },
  { key: "position", label: "Position" },
  { key: "positionChange", label: "Aendring" },
];

export function KeywordTable({ rows, loading }: KeywordTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("clicks");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "query");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    if (typeof va === "string" && typeof vb === "string") {
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortAsc
      ? (va as number) - (vb as number)
      : (vb as number) - (va as number);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200/60 bg-white">
      <div className="border-b border-stone-200 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-charcoal">Sogeord</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-green-eco" />
            <p className="text-sm text-stone-400">Indlaeser...</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-stone-400">
          Ingen sogeordsdata endnu. Synkroniser med Google Search Console
          foerst.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                {HEADERS.map((h) => (
                  <th
                    key={h.key}
                    onClick={() => handleSort(h.key)}
                    className="cursor-pointer select-none px-4 py-2.5 text-left text-xs font-medium text-stone-500 transition-colors hover:text-charcoal"
                  >
                    <span className="flex items-center gap-1">
                      {h.label}
                      <svg
                        className="h-3 w-3 opacity-40"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                        />
                      </svg>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 50).map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50"
                >
                  <td className="max-w-[300px] truncate px-4 py-2.5 font-medium text-charcoal">
                    {row.query}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-stone-700">
                    {row.clicks}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-stone-700">
                    {row.impressions.toLocaleString("da-DK")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-stone-700">
                    {(row.ctr * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 font-mono text-stone-700">
                    {row.position.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5">
                    <PositionChange change={row.positionChange} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PositionChange({ change }: { change: number | null }) {
  if (change === null || change === 0) {
    return <span className="font-mono text-stone-400">—</span>;
  }
  if (change > 0) {
    return (
      <span className="flex items-center gap-1 font-mono text-emerald-600">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 15.75l7.5-7.5 7.5 7.5"
          />
        </svg>
        +{change.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 font-mono text-rose-600">
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
      {change.toFixed(1)}
    </span>
  );
}
