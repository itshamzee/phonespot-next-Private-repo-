"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_type: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ACTION_TYPES = [
  { value: "", label: "Alle" },
  { value: "device_intake", label: "Enhed indleveret" },
  { value: "device_quick_add", label: "Hurtig tilf." },
  { value: "device_update", label: "Enhed opdateret" },
  { value: "device_delete", label: "Enhed slettet" },
  { value: "device_import", label: "Import" },
  { value: "transfer", label: "Overforsel" },
  { value: "price_change", label: "Prisaendring" },
  { value: "sku_create", label: "SKU oprettet" },
  { value: "sku_update", label: "SKU opdateret" },
  { value: "sku_delete", label: "SKU slettet" },
  { value: "stock_adjust", label: "Lagerjustering" },
  { value: "afregningsbilag_generated", label: "Afregningsbilag" },
  { value: "order_status_change", label: "Ordrestatus" },
  { value: "pos_sale", label: "POS salg" },
  { value: "refund", label: "Refundering" },
  { value: "discount_code_created", label: "Rabatkode" },
] as const;

const ACTION_BADGE_COLORS: Record<string, string> = {
  device_intake: "bg-emerald-50 text-emerald-700 border-emerald-200",
  device_quick_add: "bg-emerald-50 text-emerald-700 border-emerald-200",
  device_update: "bg-blue-50 text-blue-700 border-blue-200",
  device_delete: "bg-red-50 text-red-700 border-red-200",
  device_import: "bg-violet-50 text-violet-700 border-violet-200",
  transfer: "bg-amber-50 text-amber-700 border-amber-200",
  price_change: "bg-orange-50 text-orange-700 border-orange-200",
  sku_create: "bg-teal-50 text-teal-700 border-teal-200",
  sku_update: "bg-cyan-50 text-cyan-700 border-cyan-200",
  sku_delete: "bg-red-50 text-red-700 border-red-200",
  stock_adjust: "bg-indigo-50 text-indigo-700 border-indigo-200",
  afregningsbilag_generated: "bg-purple-50 text-purple-700 border-purple-200",
  order_status_change: "bg-sky-50 text-sky-700 border-sky-200",
  pos_sale: "bg-lime-50 text-lime-700 border-lime-200",
  refund: "bg-rose-50 text-rose-700 border-rose-200",
  discount_code_created: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
};

const DEFAULT_BADGE = "bg-gray-50 text-gray-700 border-gray-200";

const PER_PAGE = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(action: string): string {
  const found = ACTION_TYPES.find((a) => a.value === action);
  return found ? found.label : action;
}

function describeEntry(entry: ActivityEntry): string {
  const details = entry.details;
  const parts: string[] = [];

  // Build a human-readable description from entity_type + details
  if (entry.entity_type) {
    parts.push(entry.entity_type);
  }

  if (details) {
    // Common detail fields
    if (details.description && typeof details.description === "string") {
      return details.description;
    }
    if (details.model) parts.push(String(details.model));
    if (details.name) parts.push(String(details.name));
    if (details.from && details.to) {
      parts.push(`${details.from} -> ${details.to}`);
    }
    if (details.payment_method) parts.push(String(details.payment_method));
    if (details.total !== undefined) parts.push(`${details.total} kr`);
    if (details.notes) parts.push(String(details.notes));
  }

  return parts.join(" - ") || "-";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AktivitetslogPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const supabase = createBrowserClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PER_PAGE));
      if (action) params.set("action", action);
      if (search.trim()) params.set("search", search.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/platform/activity-log?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      setEntries(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch activity log:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, action, search, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  function updateFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Aktivitetslog
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          Oversigt over alle handlinger i systemet
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Action type */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">
            Handling
          </label>
          <select
            value={action}
            onChange={(e) => updateFilter(setAction, e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-sm text-charcoal shadow-sm focus:border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-charcoal/5"
          >
            {ACTION_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* From date */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">
            Fra
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => updateFilter(setFromDate, e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-sm text-charcoal shadow-sm focus:border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-charcoal/5"
          />
        </div>

        {/* To date */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">
            Til
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => updateFilter(setToDate, e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-sm text-charcoal shadow-sm focus:border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-charcoal/5"
          />
        </div>

        {/* Search */}
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">
            Soeg
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/25"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => updateFilter(setSearch, e.target.value)}
              placeholder="Soeg i detaljer..."
              className="w-full rounded-xl border border-black/[0.06] bg-white py-2.5 pl-9 pr-3 text-sm text-charcoal shadow-sm placeholder:text-charcoal/25 focus:border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-charcoal/5"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs font-medium text-charcoal/35">
        {total} {total === 1 ? "resultat" : "resultater"}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.04] bg-[#fafaf8]">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-charcoal/40">
                  Dato
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-charcoal/40">
                  Handling
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-charcoal/40">
                  Beskrivelse
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-charcoal/40">
                  Bruger
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-charcoal/30">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/10 border-t-charcoal/40" />
                      Indlaeser...
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-charcoal/30">
                    Ingen aktiviteter fundet
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-black/[0.03] transition-colors hover:bg-[#fafaf8]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-charcoal/60">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                          ACTION_BADGE_COLORS[entry.action] ?? DEFAULT_BADGE
                        }`}
                      >
                        {actionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-3 text-xs text-charcoal/70">
                      {describeEntry(entry)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-charcoal/50">
                      {entry.actor_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-charcoal/35">
            Side {page} af {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-black/[0.06] bg-white px-4 py-2 text-sm font-semibold text-charcoal/60 shadow-sm transition-all hover:border-charcoal/20 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Forrige
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-black/[0.06] bg-white px-4 py-2 text-sm font-semibold text-charcoal/60 shadow-sm transition-all hover:border-charcoal/20 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Naeste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
