"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SpotSku } from "@/lib/spot/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type StockByLocation = Record<string, number>;

interface DirtyFields {
  selling_price?: string;
  sale_price?: string;
  variant_label?: string;
  variant_sort?: string;
  is_active?: boolean;
  stock?: StockByLocation;
}

interface RowState {
  dirty: DirtyFields;
  isDirty: boolean;
}

interface SaveResult {
  id: string;
  title: string;
  success: boolean;
  error?: string;
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface Location {
  id: string;
  name: string;
}

let toastCounter = 0;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function oereToDkk(oere: number | null | undefined): string {
  if (oere == null) return "";
  return (oere / 100).toFixed(2);
}

function dkkToOere(dkk: string): number | null {
  const val = parseFloat(dkk.replace(",", "."));
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 100);
}

/* ------------------------------------------------------------------ */
/*  EditableCell                                                        */
/* ------------------------------------------------------------------ */

function EditableCell({
  value,
  isDirty,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  value: string;
  isDirty: boolean;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      step={type === "number" ? "0.01" : undefined}
      min={type === "number" ? "0" : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border px-2 py-1.5 text-xs tabular-nums text-charcoal transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
        isDirty
          ? "border-amber-300 bg-amber-50 focus:border-amber-400"
          : "border-black/[0.06] bg-white focus:border-emerald-400"
      } ${className ?? ""}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  ActiveCell                                                          */
/* ------------------------------------------------------------------ */

function ActiveCell({
  value,
  isDirty,
  onChange,
}: {
  value: boolean;
  isDirty: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80 ${
        isDirty ? "ring-2 ring-amber-300 ring-offset-1" : ""
      } ${value ? "bg-emerald-500/10 text-emerald-700" : "bg-stone-100 text-charcoal/40"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${value ? "bg-emerald-500" : "bg-charcoal/30"}`} />
      {value ? "Aktiv" : "Inaktiv"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function SpotBulkEditPage() {
  const [rows, setRows] = useState<SpotSku[]>([]);
  const [stock, setStock] = useState<Record<string, StockByLocation>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Row dirty state: id -> RowState
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Saving
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const [saveResults, setSaveResults] = useState<SaveResult[]>([]);

  // Filters
  const [variantFilter, setVariantFilter] = useState<"all" | "glass" | "privacy" | "lens" | "plateau">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  // Bulk action dropdown
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ---- Toast helpers ---- */

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  /* ---- Close dropdown on outside click ---- */

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(e.target as Node)) {
        setBulkDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ---- Fetch data ---- */

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/spot/data");
        if (!res.ok) throw new Error("Kunne ikke hente Spot SKUs");
        const j = await res.json();
        setRows(j.skus ?? []);
        setStock(j.stock ?? {});
        setLocations(j.locations ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukendt fejl");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---- Filtered rows ---- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (variantFilter !== "all" && !r.slug.includes(variantFilter)) return false;
      if (statusFilter === "active" && !r.is_active) return false;
      if (statusFilter === "inactive" && r.is_active) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.compatible_models.some((m) => m.includes(q))) return false;
      return true;
    });
  }, [rows, variantFilter, statusFilter, search]);

  /* ---- Dirty row helpers ---- */

  function getEffectiveValue(row: SpotSku, field: keyof Omit<DirtyFields, "is_active" | "stock">): string {
    const dirty = rowStates[row.id]?.dirty;
    if (dirty && field in dirty) {
      return (dirty[field] as string | undefined) ?? "";
    }
    switch (field) {
      case "selling_price":
        return oereToDkk(row.selling_price);
      case "sale_price":
        return oereToDkk(row.sale_price);
      case "variant_label":
        return row.variant_label ?? "";
      case "variant_sort":
        return String(row.variant_sort);
      default:
        return "";
    }
  }

  function getEffectiveActive(row: SpotSku): boolean {
    const dirty = rowStates[row.id]?.dirty;
    return dirty?.is_active ?? row.is_active;
  }

  function getEffectiveStock(rowId: string, locationId: string): number {
    const dirtyStock = rowStates[rowId]?.dirty?.stock;
    if (dirtyStock && locationId in dirtyStock) return dirtyStock[locationId];
    return stock[rowId]?.[locationId] ?? 0;
  }

  function isCellDirty(rowId: string, field: keyof DirtyFields): boolean {
    return field in (rowStates[rowId]?.dirty ?? {});
  }

  function isStockCellDirty(rowId: string, locationId: string): boolean {
    return locationId in (rowStates[rowId]?.dirty?.stock ?? {});
  }

  function updateCell(rowId: string, field: keyof Omit<DirtyFields, "stock">, value: string | boolean) {
    setRowStates((prev) => {
      const existing = prev[rowId] ?? { dirty: {}, isDirty: false };
      const newDirty = { ...existing.dirty, [field]: value };
      return { ...prev, [rowId]: { dirty: newDirty, isDirty: Object.keys(newDirty).length > 0 } };
    });
  }

  function updateStock(rowId: string, locationId: string, value: number) {
    setRowStates((prev) => {
      const existing = prev[rowId] ?? { dirty: {}, isDirty: false };
      const prevStock: StockByLocation = existing.dirty.stock ?? { ...stock[rowId] };
      const newStock = { ...prevStock, [locationId]: value };
      const newDirty = { ...existing.dirty, stock: newStock };
      return { ...prev, [rowId]: { dirty: newDirty, isDirty: Object.keys(newDirty).length > 0 } };
    });
  }

  /* ---- Selection helpers ---- */

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---- Bulk actions ---- */

  function bulkSetActive(value: boolean) {
    setBulkDropdownOpen(false);
    setSelected((sel) => {
      sel.forEach((id) => updateCell(id, "is_active", value));
      return sel;
    });
  }

  /* ---- Dirty row ids ---- */

  const dirtyRowIds = useMemo(
    () => Object.keys(rowStates).filter((id) => rowStates[id]?.isDirty),
    [rowStates],
  );

  /* ---- Save all dirty rows ---- */

  const saveAll = useCallback(async () => {
    if (dirtyRowIds.length === 0) return;
    setSaving(true);
    setSaveProgress({ done: 0, total: dirtyRowIds.length });
    setSaveResults([]);

    const results: SaveResult[] = [];

    for (let i = 0; i < dirtyRowIds.length; i++) {
      const id = dirtyRowIds[i];
      const row = rows.find((r) => r.id === id);
      if (!row) continue;

      const dirty = rowStates[id]?.dirty ?? {};
      const payload: Record<string, unknown> = {};

      if ("is_active" in dirty) payload.is_active = dirty.is_active;
      if ("variant_label" in dirty) payload.variant_label = dirty.variant_label || null;
      if ("variant_sort" in dirty) {
        const n = parseInt(dirty.variant_sort ?? "", 10);
        if (!isNaN(n) && n >= 0) payload.variant_sort = n;
      }
      if ("selling_price" in dirty) {
        const val = dkkToOere(dirty.selling_price ?? "");
        if (val !== null) payload.selling_price = val;
      }
      if ("sale_price" in dirty) {
        const val = dirty.sale_price ? dkkToOere(dirty.sale_price) : null;
        payload.sale_price = val;
      }
      if ("stock" in dirty) {
        payload.stock = dirty.stock;
      }

      try {
        const res = await fetch(`/api/admin/spot/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string })?.error ?? `HTTP ${res.status}`);
        }

        // Apply dirty values to local state
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const updated = { ...r };
            if ("is_active" in dirty) updated.is_active = dirty.is_active ?? r.is_active;
            if ("variant_label" in dirty) updated.variant_label = dirty.variant_label ?? null;
            if ("variant_sort" in dirty) {
              const n = parseInt(dirty.variant_sort ?? "", 10);
              if (!isNaN(n)) updated.variant_sort = n;
            }
            if ("selling_price" in dirty) {
              const val = dkkToOere(dirty.selling_price ?? "");
              if (val !== null) updated.selling_price = val;
            }
            if ("sale_price" in dirty) {
              updated.sale_price = dirty.sale_price ? dkkToOere(dirty.sale_price) : null;
            }
            return updated;
          }),
        );
        if (dirty.stock) {
          setStock((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...dirty.stock } }));
        }

        // Clear dirty state
        setRowStates((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        results.push({ id, title: row.title, success: true });
      } catch (err) {
        results.push({
          id,
          title: row.title,
          success: false,
          error: err instanceof Error ? err.message : "Ukendt fejl",
        });
      }

      setSaveProgress({ done: i + 1, total: dirtyRowIds.length });
    }

    setSaveResults(results);
    setSaving(false);

    const failed = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);

    if (failed.length === 0) {
      addToast("success", `${succeeded.length} ${succeeded.length === 1 ? "SKU" : "SKUs"} gemt`);
    } else {
      addToast(
        "error",
        `${succeeded.length} gemt, ${failed.length} fejlede: ${failed.map((r) => r.title).join(", ")}`,
      );
    }
  }, [dirtyRowIds, rows, rowStates, addToast]);

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm font-medium text-charcoal">Henter Spot SKUs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-700">
        Fejl: {error}
      </div>
    );
  }

  // Dynamic colspan: checkbox + title + variant label + sort + models + price + sale + locations... + status
  const colCount = 8 + locations.length;

  return (
    <div className="space-y-4">
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
              t.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : t.type === "error"
                  ? "border-red-500/20 bg-red-500/10 text-red-700"
                  : "border-blue-500/20 bg-blue-500/10 text-blue-700"
            }`}
          >
            {t.type === "success" && (
              <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {t.type === "error" && (
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            )}
            <span className="max-w-xs">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/spot"
            className="flex items-center gap-1.5 text-sm text-charcoal/50 transition-colors hover:text-charcoal"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Spot
          </Link>
          <span className="text-charcoal/20">/</span>
          <h2 className="font-display text-xl font-bold text-charcoal">Bulk redigering</h2>
        </div>
        <p className="text-sm text-charcoal/50">
          {rows.length} SKUs i alt &mdash; {filtered.length} vist
        </p>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 rounded-xl border border-black/[0.04] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Select all */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allVisibleSelected;
              }}
              onChange={toggleSelectAll}
              className="h-4 w-4 cursor-pointer rounded border-black/20 accent-emerald-500"
            />
            <span className="text-xs font-medium text-charcoal/60">Vælg alle</span>
          </label>

          {someSelected && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {selected.size} valgt
            </span>
          )}

          {/* Bulk actions dropdown */}
          {someSelected && (
            <div className="relative" ref={bulkDropdownRef}>
              <button
                type="button"
                onClick={() => setBulkDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-charcoal transition-all hover:bg-stone-50"
              >
                Handlinger
                <svg className="h-3.5 w-3.5 text-charcoal/40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {bulkDropdownOpen && (
                <div className="absolute left-0 top-full z-40 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => bulkSetActive(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-charcoal transition-colors hover:bg-stone-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Sæt status til Aktiv
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkSetActive(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-charcoal transition-colors hover:bg-stone-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                    Sæt status til Inaktiv
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {dirtyRowIds.length > 0 && (
            <span className="text-xs text-amber-600">
              {dirtyRowIds.length} {dirtyRowIds.length === 1 ? "ændring" : "ændringer"} ikke gemt
            </span>
          )}

          {saving && (
            <span className="text-xs text-charcoal/60">
              {saveProgress.done} af {saveProgress.total} gemt...
            </span>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || dirtyRowIds.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-all ${
              dirtyRowIds.length > 0 && !saving
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98]"
                : "cursor-not-allowed bg-stone-200 text-stone-400 shadow-none"
            }`}
          >
            {saving ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            Gem ændringer
            {dirtyRowIds.length > 0 && !saving && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px]">
                {dirtyRowIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Failed saves summary */}
      {saveResults.some((r) => !r.success) && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">Fejl ved gemning:</p>
          <ul className="mt-1 space-y-0.5">
            {saveResults
              .filter((r) => !r.success)
              .map((r) => (
                <li key={r.id} className="text-xs text-red-600">
                  {r.title} — {r.error}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg titel eller kompatibel model..."
            className="w-full rounded-xl border border-black/[0.06] bg-white py-2 pl-9 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value as typeof variantFilter)}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">Alle varianter</option>
          <option value="glass">Glass</option>
          <option value="privacy">Privacy</option>
          <option value="lens">Lens</option>
          <option value="plateau">Plateau</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">Alle statusser</option>
          <option value="active">Aktive</option>
          <option value="inactive">Inaktive</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-charcoal/40">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded border border-amber-300 bg-amber-50" />
          Ændret (ikke gemt)
        </span>
        <span>Klik i en celle for at redigere &bull; Tab for at navigere</span>
      </div>

      {/* Spreadsheet table */}
      <div className="overflow-x-auto rounded-xl border border-black/[0.04] bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/[0.04] bg-stone-50/80">
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allVisibleSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-black/20 accent-emerald-500"
                />
              </th>
              <th className="min-w-[200px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Titel
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Variant
              </th>
              <th className="w-16 px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Sort
              </th>
              <th className="w-20 px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Modeller
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Salgspris
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Udsalg
              </th>
              {locations.map((loc) => (
                <th
                  key={loc.id}
                  className="min-w-[80px] px-3 py-3 text-right font-semibold uppercase tracking-[0.08em] text-charcoal/40"
                >
                  {loc.name}
                </th>
              ))}
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-6 py-10 text-center text-sm text-charcoal/40">
                  Ingen SKUs matcher filteret
                </td>
              </tr>
            )}
            {filtered.map((row, idx) => {
              const isSelected = selected.has(row.id);
              const rowDirty = rowStates[row.id]?.isDirty ?? false;

              return (
                <tr
                  key={row.id}
                  className={`border-b border-black/[0.03] transition-colors last:border-0 ${
                    isSelected ? "bg-emerald-500/[0.03]" : idx % 2 === 0 ? "bg-white" : "bg-stone-50/40"
                  } ${rowDirty ? "ring-1 ring-inset ring-amber-200" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(row.id)}
                      className="h-4 w-4 cursor-pointer rounded border-black/20 accent-emerald-500"
                    />
                  </td>

                  {/* Titel (read-only) */}
                  <td className="px-3 py-2">
                    <div className="max-w-[240px]">
                      <p className="truncate font-medium text-charcoal" title={row.title}>
                        {row.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-charcoal/40">{row.slug}</p>
                    </div>
                  </td>

                  {/* Variant label */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={getEffectiveValue(row, "variant_label")}
                      isDirty={isCellDirty(row.id, "variant_label")}
                      onChange={(v) => updateCell(row.id, "variant_label", v)}
                      placeholder="—"
                    />
                  </td>

                  {/* Variant sort */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={getEffectiveValue(row, "variant_sort")}
                      isDirty={isCellDirty(row.id, "variant_sort")}
                      onChange={(v) => updateCell(row.id, "variant_sort", v)}
                      type="number"
                      placeholder="0"
                    />
                  </td>

                  {/* Compatible models count (read-only) */}
                  <td className="px-3 py-2 text-charcoal/50">{row.compatible_models.length} stk</td>

                  {/* Salgspris */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <EditableCell
                        value={getEffectiveValue(row, "selling_price")}
                        isDirty={isCellDirty(row.id, "selling_price")}
                        onChange={(v) => updateCell(row.id, "selling_price", v)}
                        type="number"
                        placeholder="0.00"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-charcoal/30">
                        kr
                      </span>
                    </div>
                  </td>

                  {/* Udsalgspris */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <EditableCell
                        value={getEffectiveValue(row, "sale_price")}
                        isDirty={isCellDirty(row.id, "sale_price")}
                        onChange={(v) => updateCell(row.id, "sale_price", v)}
                        type="number"
                        placeholder="—"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-charcoal/30">
                        kr
                      </span>
                    </div>
                  </td>

                  {/* Per-location stock */}
                  {locations.map((loc) => (
                    <td key={loc.id} className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={getEffectiveStock(row.id, loc.id)}
                        onChange={(e) => updateStock(row.id, loc.id, Number(e.target.value))}
                        className={`w-full rounded-lg border px-2 py-1.5 text-right text-xs tabular-nums text-charcoal transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                          isStockCellDirty(row.id, loc.id)
                            ? "border-amber-300 bg-amber-50 focus:border-amber-400"
                            : "border-black/[0.06] bg-white focus:border-emerald-400"
                        }`}
                      />
                    </td>
                  ))}

                  {/* Status toggle */}
                  <td className="px-3 py-2">
                    <ActiveCell
                      value={getEffectiveActive(row)}
                      isDirty={isCellDirty(row.id, "is_active")}
                      onChange={(v) => updateCell(row.id, "is_active", v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom save bar — visible when dirty rows exist */}
      {dirtyRowIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{dirtyRowIds.length}</span>{" "}
            {dirtyRowIds.length === 1 ? "SKU har" : "SKUs har"} ugemte ændringer
          </p>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Gemmer..." : "Gem alle ændringer"}
          </button>
        </div>
      )}
    </div>
  );
}
