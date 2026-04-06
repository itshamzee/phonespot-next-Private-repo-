"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface StockEntry {
  product_id: string;
  quantity: number;
  locations: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface SparePart {
  id: string;
  title: string;
  slug: string | null;
  images: string[];
  device_brand: string | null;
  device_model: string | null;
  selling_price: number; // oere
  cost_price: number | null; // oere
  status: "published" | "draft";
  always_in_stock: boolean;
  stock: StockEntry[];
  spare_part_categories: {
    id: string;
    name: string;
    slug: string;
  } | null;
  spare_part_quality_tiers: {
    id: string;
    name: string;
    slug: string;
    badge_color: string;
    badge_text_color: string;
  } | null;
  created_at: string;
}

const LOCATION_NAMES = ["Slagelse", "Vejle", "Online"] as const;

const LOCATION_TO_API_FIELD: Record<string, string> = {
  Slagelse: "stock_slagelse",
  Vejle: "stock_vejle",
  Online: "stock_online",
};

/* ------------------------------------------------------------------ */
/*  Inline-editable stock cell                                         */
/* ------------------------------------------------------------------ */

function InlineStock({
  productId,
  locationName,
  currentQty,
  onUpdated,
}: {
  productId: string;
  locationName: string;
  currentQty: number;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(currentQty));
  const [saving, setSaving] = useState(false);

  async function commit() {
    const parsed = parseInt(draft, 10);
    if (isNaN(parsed) || parsed < 0) {
      setDraft(String(currentQty));
      setEditing(false);
      return;
    }
    if (parsed === currentQty) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const field = LOCATION_TO_API_FIELD[locationName];
      if (!field) throw new Error("Unknown location");
      const res = await fetch(`/api/admin/spare-parts/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsed }),
      });
      if (!res.ok) throw new Error("Failed");
      onUpdated();
    } catch {
      setDraft(String(currentQty));
    }
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(currentQty));
            setEditing(false);
          }
        }}
        disabled={saving}
        className="w-16 rounded-lg border border-emerald-400 bg-white px-2 py-1 text-center text-xs tabular-nums text-charcoal focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(currentQty));
        setEditing(true);
      }}
      title="Klik for at ændre antal"
      className={`cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-all hover:ring-2 hover:ring-emerald-400/30 ${
        currentQty > 0
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-stone-100 text-charcoal/30"
      }`}
    >
      {currentQty}
    </button>
  );
}

function getStockAtLocation(product: SparePart, locationName: string): number {
  const entry = product.stock.find(
    (s) => s.locations?.name?.toLowerCase() === locationName.toLowerCase(),
  );
  return entry?.quantity ?? 0;
}

function getTotalStock(product: SparePart): number {
  return product.stock.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface QualityTier {
  id: string;
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
}

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastCounter = 0;

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReservedelePage() {
  const [products, setProducts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [globalInventory, setGlobalInventory] = useState<{
    totalQty: number;
    totalValue: number;
    byLocation: Record<string, { qty: number; value: number }>;
  } | null>(null);
  const LIMIT = 50;

  // Filters — server-side
  const [categoryFilter, setCategoryFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Brand filter — client-side derived
  const [brandFilter, setBrandFilter] = useState("alle");

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityTiers, setQualityTiers] = useState<QualityTier[]>([]);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toggling status
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Toast helpers ---- */

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ---- Debounce search ---- */

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 350);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  /* ---- Fetch reference data on mount ---- */

  useEffect(() => {
    async function fetchReference() {
      const [catRes, qualRes] = await Promise.all([
        fetch("/api/admin/spare-parts/categories"),
        fetch("/api/admin/spare-parts/quality-tiers"),
      ]);
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(Array.isArray(data) ? data : []);
      }
      if (qualRes.ok) {
        const data = await qualRes.json();
        setQualityTiers(Array.isArray(data) ? data : []);
      }
    }
    fetchReference();
  }, []);

  /* ---- Fetch products ---- */

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (qualityFilter) params.set("quality", qualityFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (locationFilter) params.set("location", locationFilter);
    if (searchDebounced) params.set("search", searchDebounced);
    params.set("page", String(page));

    try {
      const res = await fetch(`/api/admin/spare-parts?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente reservedele");
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
      if (data.inventory) setGlobalInventory(data.inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, qualityFilter, statusFilter, locationFilter, searchDebounced, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ---- Derived: unique brands from fetched products ---- */

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.device_brand) set.add(p.device_brand);
    }
    return Array.from(set).sort();
  }, [products]);

  /* ---- Client-side brand filter ---- */

  const filteredProducts = useMemo(() => {
    if (brandFilter === "alle") return products;
    return products.filter((p) => p.device_brand === brandFilter);
  }, [products, brandFilter]);

  /* ---- Status toggle ---- */

  const toggleStatus = useCallback(
    async (product: SparePart) => {
      const next = product.status === "published" ? "draft" : "published";
      setTogglingId(product.id);
      try {
        const res = await fetch(`/api/admin/spare-parts/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error("Statusskift fejlede");
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: next } : p)),
        );
        addToast("success", next === "published" ? "Publiceret" : "Sat som kladde");
      } catch {
        addToast("error", "Fejl ved statusskift");
      } finally {
        setTogglingId(null);
      }
    },
    [addToast],
  );

  /* ---- Reset filters ---- */

  const resetFilters = useCallback(() => {
    setCategoryFilter("");
    setQualityFilter("");
    setStatusFilter("");
    setLocationFilter("");
    setSearch("");
    setBrandFilter("alle");
    setPage(1);
  }, []);

  const hasActiveFilters =
    categoryFilter !== "" ||
    qualityFilter !== "" ||
    statusFilter !== "" ||
    locationFilter !== "" ||
    search !== "" ||
    brandFilter !== "alle";

  /* ---- Pagination ---- */

  const totalPages = Math.ceil(total / LIMIT);

  /* ---- Stats ---- */

  const publishedCount = products.filter((p) => p.status === "published").length;
  const draftCount = products.filter((p) => p.status === "draft").length;

  /* ---- Inventory value ---- */

  const inventoryStats = useMemo(() => {
    const byLocation: Record<string, { qty: number; value: number }> = {};
    for (const locName of LOCATION_NAMES) {
      byLocation[locName] = { qty: 0, value: 0 };
    }
    let totalQty = 0;
    let totalValue = 0;
    for (const p of products) {
      for (const s of p.stock) {
        const name = s.locations?.name;
        const qty = s.quantity ?? 0;
        const val = qty * (p.cost_price ?? 0);
        totalQty += qty;
        totalValue += val;
        if (name && name in byLocation) {
          byLocation[name].qty += qty;
          byLocation[name].value += val;
        }
      }
    }
    return { totalQty, totalValue, byLocation };
  }, [products]);

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all ${
              t.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-red-500/20 bg-red-500/10 text-red-700"
            }`}
          >
            {t.type === "success" ? (
              <svg
                className="h-4 w-4 shrink-0 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 shrink-0 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-charcoal">Reservedele</h2>
          <p className="mt-1 text-sm text-charcoal/50">
            Administrer reservedele, kvalitet og priser
          </p>
        </div>
        <Link
          href="/admin/reservedele/opret"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Opret ny
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Produkter i alt", value: total, color: "text-charcoal" },
          { label: "Publicerede", value: publishedCount, color: "text-emerald-600" },
          { label: "Kladder", value: draftCount, color: "text-amber-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-black/[0.04] bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/40">
              {s.label}
            </p>
            <p className={`mt-0.5 font-display text-2xl font-bold tabular-nums ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Inventory value summary */}
      {!loading && globalInventory && (
        <div className="rounded-xl border border-black/[0.04] bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/40">
            Samlet lagerværdi
          </p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums text-charcoal">
            {(globalInventory.totalValue / 100).toLocaleString("da-DK", {
              style: "currency",
              currency: "DKK",
              maximumFractionDigits: 0,
            })}
            <span className="ml-2 text-sm font-normal text-charcoal/40">
              ({globalInventory.totalQty} stk i alt)
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {LOCATION_NAMES.map((locName) => {
              const loc = globalInventory.byLocation[locName] ?? { qty: 0, value: 0 };
              return (
                <span key={locName} className="text-[12px] text-charcoal/60">
                  <span className="font-semibold text-charcoal/80">{locName}:</span>{" "}
                  {loc.qty} stk &mdash;{" "}
                  {(loc.value / 100).toLocaleString("da-DK", {
                    style: "currency",
                    currency: "DKK",
                    maximumFractionDigits: 0,
                  })}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30"
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
            placeholder="Søg titel, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-2 pl-9 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 sm:w-56"
          />
        </div>

        {/* Category dropdown */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          <option value="">Alle kategorier</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Brand dropdown (client-side) */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          <option value="alle">Alle brands</option>
          {availableBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Quality dropdown */}
        <select
          value={qualityFilter}
          onChange={(e) => {
            setQualityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          <option value="">Alle kvaliteter</option>
          {qualityTiers.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          <option value="">Alle statuser</option>
          <option value="published">Publicerede</option>
          <option value="draft">Kladder</option>
        </select>

        {/* Location dropdown */}
        <select
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          <option value="">Alle lokationer</option>
          {LOCATION_NAMES.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        {/* Reset filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm font-medium text-charcoal/50 transition-colors hover:bg-stone-50 hover:text-charcoal"
          >
            Nulstil
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-black/[0.04] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-charcoal/40">
            <svg
              className="h-10 w-10 text-red-400/60"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button
              type="button"
              onClick={fetchProducts}
              className="text-xs text-emerald-600 hover:underline"
            >
              Prøv igen
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-charcoal/40">
            <svg
              className="h-12 w-12 text-charcoal/15"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
              />
            </svg>
            <p className="text-sm font-medium">Ingen reservedele fundet</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-emerald-600 hover:underline"
              >
                Nulstil filtre
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-stone-50/60">
                  <th className="w-14 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Billede
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Titel
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Enhed
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Kvalitet
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Pris
                  </th>
                  {LOCATION_NAMES.map((locName) => (
                    <th
                      key={locName}
                      className={`px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] ${
                        locationFilter === locName
                          ? "text-emerald-600"
                          : "text-charcoal/35"
                      }`}
                    >
                      {locName}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Handling
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="group/row transition-colors hover:bg-stone-50/50"
                  >
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg border border-black/[0.04] bg-stone-100">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg
                              className="h-5 w-5 text-charcoal/20"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/reservedele/${product.id}`}
                        className="font-medium text-charcoal transition-colors hover:text-emerald-600 hover:underline"
                      >
                        {product.title}
                      </Link>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {product.spare_part_categories ? (
                        <span className="text-charcoal/70">
                          {product.spare_part_categories.name}
                        </span>
                      ) : (
                        <span className="text-charcoal/25">—</span>
                      )}
                    </td>

                    {/* Device */}
                    <td className="px-4 py-3">
                      {product.device_brand || product.device_model ? (
                        <span className="text-charcoal/70">
                          {[product.device_brand, product.device_model]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      ) : (
                        <span className="text-charcoal/25">—</span>
                      )}
                    </td>

                    {/* Quality badge */}
                    <td className="px-4 py-3">
                      {product.spare_part_quality_tiers ? (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{
                            backgroundColor: product.spare_part_quality_tiers.badge_color,
                            color: product.spare_part_quality_tiers.badge_text_color,
                          }}
                        >
                          {product.spare_part_quality_tiers.name}
                        </span>
                      ) : (
                        <span className="text-charcoal/25">—</span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <span className="tabular-nums font-semibold text-charcoal">
                        {(product.selling_price / 100).toLocaleString("da-DK", {
                          style: "currency",
                          currency: "DKK",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </td>

                    {/* Per-location stock columns — inline editable */}
                    {LOCATION_NAMES.map((locName) => {
                      const qty = getStockAtLocation(product, locName);
                      const isHighlighted = locationFilter === locName;
                      return (
                        <td
                          key={locName}
                          className={`px-3 py-3 text-center ${isHighlighted ? "bg-emerald-500/5" : ""}`}
                        >
                          {product.always_in_stock ? (
                            locName === "Online" ? (
                              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-600">
                                Altid
                              </span>
                            ) : (
                              <span className="text-charcoal/20">—</span>
                            )
                          ) : (
                            <InlineStock
                              productId={product.id}
                              locationName={locName}
                              currentQty={qty}
                              onUpdated={() => fetchProducts()}
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* Total stock */}
                    <td className="px-3 py-3 text-center">
                      {product.always_in_stock ? (
                        <span className="text-charcoal/20">—</span>
                      ) : (() => {
                        const total = getTotalStock(product);
                        return total > 0 ? (
                          <span className="tabular-nums font-semibold text-charcoal/70">
                            {total}
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                            Udsolgt
                          </span>
                        );
                      })()}
                    </td>

                    {/* Status toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={togglingId === product.id}
                        onClick={() => toggleStatus(product)}
                        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                          product.status === "published"
                            ? "bg-emerald-500"
                            : "bg-stone-300"
                        }`}
                        title={
                          product.status === "published"
                            ? "Klik for at sætte som kladde"
                            : "Klik for at publicere"
                        }
                        aria-label={
                          product.status === "published" ? "Publiceret" : "Kladde"
                        }
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            product.status === "published"
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                      <p className="mt-0.5 text-[10px] text-charcoal/35">
                        {product.status === "published" ? "Publiceret" : "Kladde"}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/admin/reservedele/${product.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Rediger
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-charcoal/50">
            Side {page} af {totalPages} — {total} produkter i alt
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-black/[0.06] bg-white px-3 py-1.5 text-sm font-medium text-charcoal/60 transition-colors hover:bg-stone-50 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Forrige
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show pages around current
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                    pageNum === page
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                      : "border border-black/[0.06] bg-white text-charcoal/60 hover:bg-stone-50 hover:text-charcoal"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-black/[0.06] bg-white px-3 py-1.5 text-sm font-medium text-charcoal/60 transition-colors hover:bg-stone-50 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Næste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

