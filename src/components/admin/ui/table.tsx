"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Højrestil til tal. */
  align?: "left" | "right";
  /** Skjul kolonnen på små skærme. */
  hideBelow?: "sm" | "md" | "lg";
  className?: string;
  render: (row: T) => ReactNode;
}

const hide: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

/**
 * Fælles listetabel til admin. Hårlinjer, ingen zebra, tal til højre,
 * tom-tilstand med handling, og vandret scroll i stedet for at knække layoutet.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: { title: string; description?: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-sand bg-white">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-sand text-left text-[13px] text-gray">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`px-3 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""} ${c.hideBelow ? hide[c.hideBelow] : ""} ${c.className ?? ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {loading && rows.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-3 ${c.hideBelow ? hide[c.hideBelow] : ""}`}>
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-cream" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && empty && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <p className="text-[15px] font-medium text-charcoal">{empty.title}</p>
                {empty.description && <p className="mt-1 text-[13px] text-gray">{empty.description}</p>}
                {empty.action && <div className="mt-4 flex justify-center">{empty.action}</div>}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? "cursor-pointer hover:bg-cream/60" : ""} ${loading ? "opacity-60" : ""}`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 align-middle ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.hideBelow ? hide[c.hideBelow] : ""} ${c.className ?? ""}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  limit,
  total,
  onChange,
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between gap-3 text-[13px] text-gray">
      <span>
        {total === 0 ? "Ingen" : `${from}–${to} af ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>Forrige</Button>
        <span className="px-2 tabular-nums">{page} / {pages}</span>
        <Button size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages}>Næste</Button>
      </div>
    </div>
  );
}

/** Lille statusmærke til tabeller. */
export function Tag({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber" | "red"; children: ReactNode }) {
  const tones = {
    neutral: "bg-cream text-gray",
    green: "bg-green-pale text-green-eco",
    amber: "bg-[#FFF4E5] text-[#8A4B08]",
    red: "bg-[#FDECEC] text-[#B42318]",
  };
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-medium ${tones[tone]}`}>{children}</span>;
}
