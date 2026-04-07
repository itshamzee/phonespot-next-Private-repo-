"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SparePart {
  id: string;
  title: string;
  slug: string | null;
  images: string[];
  device_brand: string | null;
  device_model: string | null;
  selling_price: number;
  cost_price: number | null;
  b2b_price: number | null;
  sale_price: number | null;
  product_number: string | null;
  barcode: string | null;
  ean: string | null;
  status: "published" | "draft";
  spare_part_categories: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface DirtyFields {
  product_number?: string;
  barcode?: string;
  ean?: string;
  cost_price?: string;
  selling_price?: string;
  b2b_price?: string;
  sale_price?: string;
  status?: "published" | "draft";
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
/*  Editable cell component                                             */
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
/*  Status toggle cell                                                  */
/* ------------------------------------------------------------------ */

function StatusCell({
  value,
  isDirty,
  onChange,
}: {
  value: "published" | "draft";
  isDirty: boolean;
  onChange: (v: "published" | "draft") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value === "published" ? "draft" : "published")}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80 ${
        isDirty ? "ring-2 ring-amber-300 ring-offset-1" : ""
      } ${
        value === "published"
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-stone-100 text-charcoal/40"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          value === "published" ? "bg-emerald-500" : "bg-charcoal/30"
        }`}
      />
      {value === "published" ? "Publiceret" : "Kladde"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function BulkEditPage() {
  const [products, setProducts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Row dirty state: productId -> RowState
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Saving
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const [saveResults, setSaveResults] = useState<SaveResult[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("alle");

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

  /* ---- Fetch all spare parts (paginate through all pages) ---- */

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // First fetch to get total
        const firstRes = await fetch("/api/admin/spare-parts?page=1&limit=50");
        if (!firstRes.ok) throw new Error("Kunne ikke hente reservedele");
        const firstData = await firstRes.json();
        const total: number = firstData.total ?? 0;
        const limit = 50;
        const totalPages = Math.ceil(total / limit);

        setLoadProgress({ loaded: firstData.products?.length ?? 0, total });

        const allProducts: SparePart[] = [...(firstData.products ?? [])];

        // Fetch remaining pages in parallel (up to 5 at a time to avoid overload)
        if (totalPages > 1) {
          const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
          const BATCH = 5;
          for (let b = 0; b < pageNumbers.length; b += BATCH) {
            const batch = pageNumbers.slice(b, b + BATCH);
            const results = await Promise.all(
              batch.map((p) => fetch(`/api/admin/spare-parts?page=${p}&limit=50`).then((r) => r.json())),
            );
            for (const data of results) {
              allProducts.push(...(data.products ?? []));
            }
            setLoadProgress({ loaded: allProducts.length, total });
          }
        }

        setProducts(allProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukendt fejl");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  /* ---- Derived categories for filter ---- */

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) {
      if (p.spare_part_categories) {
        seen.set(p.spare_part_categories.id, p.spare_part_categories.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  /* ---- Filtered rows ---- */

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.product_number ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        (p.ean ?? "").toLowerCase().includes(q);
      const matchCategory =
        categoryFilter === "alle" || p.spare_part_categories?.id === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  /* ---- Dirty row helpers ---- */

  function getEffectiveValue(product: SparePart, field: keyof DirtyFields): string {
    const dirty = rowStates[product.id]?.dirty;
    if (dirty && field in dirty) {
      return (dirty[field] as string | undefined) ?? "";
    }
    switch (field) {
      case "product_number":
        return product.product_number ?? "";
      case "barcode":
        return product.barcode ?? "";
      case "ean":
        return product.ean ?? "";
      case "cost_price":
        return oereToDkk(product.cost_price);
      case "selling_price":
        return oereToDkk(product.selling_price);
      case "b2b_price":
        return oereToDkk(product.b2b_price);
      case "sale_price":
        return oereToDkk(product.sale_price);
      case "status":
        return product.status;
      default:
        return "";
    }
  }

  function getEffectiveStatus(product: SparePart): "published" | "draft" {
    const dirty = rowStates[product.id]?.dirty;
    return dirty?.status ?? product.status;
  }

  function isCellDirty(productId: string, field: keyof DirtyFields): boolean {
    return field in (rowStates[productId]?.dirty ?? {});
  }

  function updateCell(productId: string, field: keyof DirtyFields, value: string | "published" | "draft") {
    setRowStates((prev) => {
      const existing = prev[productId] ?? { dirty: {}, isDirty: false };
      const newDirty = { ...existing.dirty, [field]: value };
      return {
        ...prev,
        [productId]: { dirty: newDirty, isDirty: Object.keys(newDirty).length > 0 },
      };
    });
  }

  /* ---- Selection helpers ---- */

  const allVisibleSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selected.has(p.id));

  const someSelected = selected.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredProducts.forEach((p) => next.add(p.id));
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

  function bulkSetStatus(status: "published" | "draft") {
    setBulkDropdownOpen(false);
    setSelected((sel) => {
      sel.forEach((id) => updateCell(id, "status", status));
      return sel;
    });
  }

  function bulkDelete() {
    setBulkDropdownOpen(false);
    if (!window.confirm(`Slet ${selected.size} valgte produkter? Dette kan ikke fortrydes.`)) return;
    // Optimistically remove from local list
    const toDelete = new Set(selected);
    setProducts((prev) => prev.filter((p) => !toDelete.has(p.id)));
    setSelected(new Set());
    // Fire delete PATCHes — using status "draft" as soft delete isn't available; log note
    addToast("info", "Sletning er ikke tilgængelig via bulk. Brug individuel redigering.");
  }

  /* ---- Dirty product ids ---- */

  const dirtyProductIds = useMemo(
    () => Object.keys(rowStates).filter((id) => rowStates[id]?.isDirty),
    [rowStates],
  );

  /* ---- Save all dirty rows ---- */

  const saveAll = useCallback(async () => {
    if (dirtyProductIds.length === 0) return;
    setSaving(true);
    setSaveProgress({ done: 0, total: dirtyProductIds.length });
    setSaveResults([]);

    const results: SaveResult[] = [];

    for (let i = 0; i < dirtyProductIds.length; i++) {
      const id = dirtyProductIds[i];
      const product = products.find((p) => p.id === id);
      if (!product) continue;

      const dirty = rowStates[id]?.dirty ?? {};
      const payload: Record<string, unknown> = {};

      if ("product_number" in dirty) payload.product_number = dirty.product_number || null;
      if ("barcode" in dirty) payload.barcode = dirty.barcode || null;
      if ("ean" in dirty) payload.ean = dirty.ean || null;
      if ("status" in dirty) payload.status = dirty.status;

      if ("cost_price" in dirty) {
        const val = dkkToOere(dirty.cost_price ?? "");
        if (val !== null) payload.cost_price = val;
      }
      if ("selling_price" in dirty) {
        const val = dkkToOere(dirty.selling_price ?? "");
        if (val !== null) payload.selling_price = val;
      }
      if ("b2b_price" in dirty) {
        const val = dirty.b2b_price ? dkkToOere(dirty.b2b_price) : null;
        payload.b2b_price = val;
      }
      if ("sale_price" in dirty) {
        const val = dirty.sale_price ? dkkToOere(dirty.sale_price) : null;
        payload.sale_price = val;
      }

      try {
        const res = await fetch(`/api/admin/spare-parts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        // Update local product state
        const updatedProduct = await res.json().catch(() => null);
        if (updatedProduct) {
          setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedProduct } : p)));
        } else {
          // Apply dirty fields to local state manually
          setProducts((prev) =>
            prev.map((p) => {
              if (p.id !== id) return p;
              const updated = { ...p };
              if ("product_number" in dirty) updated.product_number = dirty.product_number || null;
              if ("barcode" in dirty) updated.barcode = dirty.barcode || null;
              if ("ean" in dirty) updated.ean = dirty.ean || null;
              if ("status" in dirty) updated.status = (dirty.status as "published" | "draft") ?? p.status;
              if ("cost_price" in dirty) updated.cost_price = dkkToOere(dirty.cost_price ?? "");
              if ("selling_price" in dirty) {
                const val = dkkToOere(dirty.selling_price ?? "");
                if (val !== null) updated.selling_price = val;
              }
              if ("b2b_price" in dirty) updated.b2b_price = dirty.b2b_price ? dkkToOere(dirty.b2b_price) : null;
              if ("sale_price" in dirty) updated.sale_price = dirty.sale_price ? dkkToOere(dirty.sale_price) : null;
              return updated;
            }),
          );
        }
        // Clear dirty state for this product
        setRowStates((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        results.push({ id, title: product.title, success: true });
      } catch (err) {
        results.push({
          id,
          title: product.title,
          success: false,
          error: err instanceof Error ? err.message : "Ukendt fejl",
        });
      }

      setSaveProgress({ done: i + 1, total: dirtyProductIds.length });
    }

    setSaveResults(results);
    setSaving(false);

    const failed = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);

    if (failed.length === 0) {
      addToast("success", `${succeeded.length} ${succeeded.length === 1 ? "produkt" : "produkter"} gemt`);
    } else {
      addToast(
        "error",
        `${succeeded.length} gemt, ${failed.length} fejlede: ${failed.map((r) => r.title).join(", ")}`,
      );
    }
  }, [dirtyProductIds, products, rowStates, addToast]);

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <div className="text-center">
          <p className="text-sm font-medium text-charcoal">Henter reservedele...</p>
          {loadProgress.total > 0 && (
            <p className="mt-1 text-xs text-charcoal/50">
              {loadProgress.loaded} af {loadProgress.total} hentet
            </p>
          )}
        </div>
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
            {t.type === "info" && (
              <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
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
            href="/admin/reservedele"
            className="flex items-center gap-1.5 text-sm text-charcoal/50 transition-colors hover:text-charcoal"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Reservedele
          </Link>
          <span className="text-charcoal/20">/</span>
          <h2 className="font-display text-xl font-bold text-charcoal">Bulk redigering</h2>
        </div>
        <p className="text-sm text-charcoal/50">
          {products.length} produkter hentet &mdash; {filteredProducts.length} vist
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

          {/* Selected count */}
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
                    onClick={() => bulkSetStatus("published")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-charcoal transition-colors hover:bg-stone-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Sæt status til Publiceret
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkSetStatus("draft")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-charcoal transition-colors hover:bg-stone-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                    Sæt status til Kladde
                  </button>
                  <div className="my-1 border-t border-black/[0.04]" />
                  <button
                    type="button"
                    onClick={bulkDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Slet valgte
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Dirty count indicator */}
          {dirtyProductIds.length > 0 && (
            <span className="text-xs text-amber-600">
              {dirtyProductIds.length} {dirtyProductIds.length === 1 ? "ændring" : "ændringer"} ikke gemt
            </span>
          )}

          {/* Save progress */}
          {saving && (
            <span className="text-xs text-charcoal/60">
              {saveProgress.done} af {saveProgress.total} gemt...
            </span>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || dirtyProductIds.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-all ${
              dirtyProductIds.length > 0 && !saving
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
            {dirtyProductIds.length > 0 && !saving && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px]">
                {dirtyProductIds.length}
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

      {/* Search + category filter */}
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
            placeholder="Søg på titel, SKU, stregkode..."
            className="w-full rounded-xl border border-black/[0.06] bg-white py-2 pl-9 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="alle">Alle kategorier</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
              <th className="w-12 px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Billede
              </th>
              <th className="min-w-[180px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Titel
              </th>
              <th className="min-w-[100px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                SKU
              </th>
              <th className="min-w-[110px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                MPN/Stregkode
              </th>
              <th className="min-w-[100px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                EAN
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Kostpris
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Salgspris
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                B2B pris
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Udsalgspris
              </th>
              <th className="min-w-[100px] px-3 py-3 text-left font-semibold uppercase tracking-[0.08em] text-charcoal/40">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-10 text-center text-sm text-charcoal/40">
                  Ingen produkter matcher din søgning
                </td>
              </tr>
            )}
            {filteredProducts.map((product, idx) => {
              const isSelected = selected.has(product.id);
              const rowDirty = rowStates[product.id]?.isDirty ?? false;
              const thumb = product.images?.[0] ?? null;

              return (
                <tr
                  key={product.id}
                  className={`border-b border-black/[0.03] transition-colors last:border-0 ${
                    isSelected ? "bg-emerald-500/[0.03]" : idx % 2 === 0 ? "bg-white" : "bg-stone-50/40"
                  } ${rowDirty ? "ring-1 ring-inset ring-amber-200" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(product.id)}
                      className="h-4 w-4 cursor-pointer rounded border-black/20 accent-emerald-500"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="px-3 py-2">
                    {thumb ? (
                      <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-black/[0.04]">
                        <Image
                          src={thumb}
                          alt={product.title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.04] bg-stone-100">
                        <svg className="h-4 w-4 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                  </td>

                  {/* Titel (read-only) */}
                  <td className="px-3 py-2">
                    <div className="max-w-[220px]">
                      <p className="truncate font-medium text-charcoal" title={product.title}>
                        {product.title}
                      </p>
                      {product.spare_part_categories && (
                        <p className="mt-0.5 truncate text-[10px] text-charcoal/40">
                          {product.spare_part_categories.name}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={getEffectiveValue(product, "product_number")}
                      isDirty={isCellDirty(product.id, "product_number")}
                      onChange={(v) => updateCell(product.id, "product_number", v)}
                      placeholder="SKU"
                    />
                  </td>

                  {/* MPN/Barcode */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={getEffectiveValue(product, "barcode")}
                      isDirty={isCellDirty(product.id, "barcode")}
                      onChange={(v) => updateCell(product.id, "barcode", v)}
                      placeholder="MPN"
                    />
                  </td>

                  {/* EAN */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={getEffectiveValue(product, "ean")}
                      isDirty={isCellDirty(product.id, "ean")}
                      onChange={(v) => updateCell(product.id, "ean", v)}
                      placeholder="EAN"
                    />
                  </td>

                  {/* Kostpris */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <EditableCell
                        value={getEffectiveValue(product, "cost_price")}
                        isDirty={isCellDirty(product.id, "cost_price")}
                        onChange={(v) => updateCell(product.id, "cost_price", v)}
                        type="number"
                        placeholder="0.00"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-charcoal/30">
                        kr
                      </span>
                    </div>
                  </td>

                  {/* Salgspris */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <EditableCell
                        value={getEffectiveValue(product, "selling_price")}
                        isDirty={isCellDirty(product.id, "selling_price")}
                        onChange={(v) => updateCell(product.id, "selling_price", v)}
                        type="number"
                        placeholder="0.00"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-charcoal/30">
                        kr
                      </span>
                    </div>
                  </td>

                  {/* B2B pris */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <EditableCell
                        value={getEffectiveValue(product, "b2b_price")}
                        isDirty={isCellDirty(product.id, "b2b_price")}
                        onChange={(v) => updateCell(product.id, "b2b_price", v)}
                        type="number"
                        placeholder="—"
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
                        value={getEffectiveValue(product, "sale_price")}
                        isDirty={isCellDirty(product.id, "sale_price")}
                        onChange={(v) => updateCell(product.id, "sale_price", v)}
                        type="number"
                        placeholder="—"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-charcoal/30">
                        kr
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <StatusCell
                      value={getEffectiveStatus(product)}
                      isDirty={isCellDirty(product.id, "status")}
                      onChange={(v) => updateCell(product.id, "status", v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom save bar — visible when scrolled past top toolbar */}
      {dirtyProductIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{dirtyProductIds.length}</span>{" "}
            {dirtyProductIds.length === 1 ? "produkt har" : "produkter har"} ugemte ændringer
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
