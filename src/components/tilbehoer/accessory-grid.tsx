"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TILBEHOER_CATEGORIES } from "@/lib/tilbehoer-config";
import type { Accessory } from "@/lib/supabase/platform-types";
import { AccessoryCard } from "./accessory-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Filters {
  search: string;
  category: string;
  model: string;
  inStore: boolean;
}

interface PriceRange {
  label: string;
  min: number;
  max: number;
}

type SortOption = "recommended" | "price-asc" | "price-desc" | "newest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRICE_RANGES: PriceRange[] = [
  { label: "Under 100 kr", min: 0, max: 9999 },
  { label: "100–299 kr", min: 10000, max: 29999 },
  { label: "300–499 kr", min: 30000, max: 49999 },
  { label: "500+ kr", min: 50000, max: Infinity },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Anbefalet" },
  { value: "price-asc", label: "Pris: Lav → Høj" },
  { value: "price-desc", label: "Pris: Høj → Lav" },
  { value: "newest", label: "Nyeste" },
];

const POPULAR_MODELS = [
  "iPhone 16",
  "iPhone 15",
  "iPhone 14",
  "iPhone 13",
  "Samsung S25",
  "Samsung S24",
  "Samsung A55",
  "Samsung A35",
];

const LS_DEVICE_KEY = "phonespot_device";

// ---------------------------------------------------------------------------
// Helper — debounce hook
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Category chips
// ---------------------------------------------------------------------------

function CategoryChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          value === ""
            ? "bg-green-eco text-white"
            : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
        }`}
      >
        Alle kategorier
      </button>
      {TILBEHOER_CATEGORIES.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onChange(cat.slug)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === cat.slug
              ? "bg-green-eco text-white"
              : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Removable active filter chip
// ---------------------------------------------------------------------------

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-green-eco/10 px-3 py-1.5 text-sm font-medium text-green-eco">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Fjern filter: ${label}`}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-green-eco/20"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <path d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white">
      <div className="aspect-square animate-pulse bg-cream" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded-full bg-sand" />
        <div className="h-4 w-full animate-pulse rounded-full bg-sand" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-sand" />
        <div className="mt-3 h-10 animate-pulse rounded-full bg-sand" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AccessoryGridProps {
  externalModel?: string;
  initialCategory?: string;
}

export function AccessoryGrid({
  externalModel,
  initialCategory,
}: AccessoryGridProps = {}) {
  // API-level filters — changes trigger a re-fetch
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: initialCategory ?? "",
    model: externalModel ?? "",
    inStore: false,
  });

  // Client-side filters — applied after fetch, no re-fetch
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] =
    useState<PriceRange | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  // Mobile filter drawer
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [products, setProducts] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 350);
  const abortRef = useRef<AbortController | null>(null);

  // Restore saved device from localStorage on mount (only when no external model)
  useEffect(() => {
    if (externalModel !== undefined) return;
    try {
      const saved = localStorage.getItem(LS_DEVICE_KEY);
      if (saved) {
        setFilters((prev) => ({ ...prev, model: saved }));
      }
    } catch {
      // localStorage unavailable (SSR / private mode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external model prop changes
  useEffect(() => {
    if (externalModel !== undefined) {
      setFilter("model", externalModel);
    }
  }, [externalModel]);

  // Persist selected model to localStorage
  useEffect(() => {
    if (externalModel !== undefined) return;
    try {
      if (filters.model) {
        localStorage.setItem(LS_DEVICE_KEY, filters.model);
      } else {
        localStorage.removeItem(LS_DEVICE_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  }, [filters.model, externalModel]);

  // Derive available brand list from currently loaded products
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [products]);

  // Fetch from API when API-level filters change
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.model) params.set("model", filters.model);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.inStore) params.set("inStore", "true");

    fetch(`/api/accessories?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Kunne ikke hente produkter");
        return res.json() as Promise<Accessory[]>;
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Noget gik galt");
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters.category, filters.model, debouncedSearch, filters.inStore]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = filterDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterDrawerOpen]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearAll() {
    setFilters({ search: "", category: "", model: "", inStore: false });
    setSelectedBrand("");
    setSelectedPriceRange(null);
    setSortBy("recommended");
  }

  // Client-side: brand + price filter + sort
  const displayedProducts = useMemo(() => {
    let result = products;

    if (selectedBrand) {
      result = result.filter(
        (p) => p.brand?.toLowerCase() === selectedBrand.toLowerCase()
      );
    }

    if (selectedPriceRange) {
      const { min, max } = selectedPriceRange;
      result = result.filter((p) => {
        const price =
          p.sale_price != null && p.sale_price < p.price
            ? p.sale_price
            : p.price;
        return price >= min && price <= max;
      });
    }

    const copy = [...result];
    switch (sortBy) {
      case "price-asc":
        return copy.sort((a, b) => {
          const ap =
            a.sale_price != null && a.sale_price < a.price
              ? a.sale_price
              : a.price;
          const bp =
            b.sale_price != null && b.sale_price < b.price
              ? b.sale_price
              : b.price;
          return ap - bp;
        });
      case "price-desc":
        return copy.sort((a, b) => {
          const ap =
            a.sale_price != null && a.sale_price < a.price
              ? a.sale_price
              : a.price;
          const bp =
            b.sale_price != null && b.sale_price < b.price
              ? b.sale_price
              : b.price;
          return bp - ap;
        });
      case "newest":
        return copy.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return copy; // "recommended" — keep API order
    }
  }, [products, selectedBrand, selectedPriceRange, sortBy]);

  const filteredCount = displayedProducts.length;

  const activeFilterCount = [
    filters.category !== "",
    filters.model !== "",
    filters.inStore,
    debouncedSearch !== "",
    selectedBrand !== "",
    selectedPriceRange !== null,
  ].filter(Boolean).length;

  // ---------------------------------------------------------------------------
  // Shared UI fragments (used in both desktop bar and mobile drawer)
  // ---------------------------------------------------------------------------

  const brandChips = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setSelectedBrand("")}
        className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
          selectedBrand === ""
            ? "bg-green-eco text-white"
            : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
        }`}
      >
        Alle
      </button>
      {availableBrands.slice(0, 8).map((brand) => (
        <button
          key={brand}
          onClick={() =>
            setSelectedBrand((prev) => (prev === brand ? "" : brand))
          }
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            selectedBrand === brand
              ? "bg-green-eco text-white"
              : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
          }`}
        >
          {brand}
        </button>
      ))}
    </div>
  );

  const priceChips = (
    <div className="flex flex-wrap gap-2">
      {PRICE_RANGES.map((range) => {
        const isActive = selectedPriceRange?.label === range.label;
        return (
          <button
            key={range.label}
            onClick={() =>
              setSelectedPriceRange((prev) =>
                prev?.label === range.label ? null : range
              )
            }
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-green-eco text-white"
                : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );

  const sortSelect = (
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as SortOption)}
      className="rounded-lg border border-sand bg-white px-3 py-1.5 text-sm text-charcoal focus:border-green-eco focus:outline-none"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Model finder — only shown when no external picker */}
      {externalModel === undefined && (
        <div className="rounded-2xl border border-sand bg-cream p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            Find tilbehør til din mobil
          </p>
          <div className="relative mb-3">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-charcoal/40"
              >
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <circle cx="12" cy="18" r="1" />
              </svg>
            </div>
            <input
              type="search"
              value={filters.model}
              onChange={(e) => setFilter("model", e.target.value)}
              placeholder="F.eks. iPhone 15 eller Samsung S24..."
              className="w-full rounded-full border border-sand bg-white py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
            />
            {filters.model && (
              <button
                onClick={() => setFilter("model", "")}
                className="absolute inset-y-0 right-3 flex items-center px-1 text-charcoal/30 hover:text-charcoal"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setFilter("model", filters.model === m ? "" : m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filters.model === m
                    ? "bg-green-eco text-white"
                    : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4 text-charcoal/40"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Søg efter tilbehør..."
          className="w-full rounded-full border border-sand bg-white py-3 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
        />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Desktop filter bar                                                   */}
      {/* ------------------------------------------------------------------- */}
      <div className="hidden md:block">
        <div className="rounded-xl border border-sand bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* In-store toggle */}
            <button
              onClick={() => setFilter("inStore", !filters.inStore)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                filters.inStore
                  ? "bg-green-eco text-white"
                  : "border border-sand text-charcoal hover:border-green-eco/40"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                />
              </svg>
              Kun i butik
            </button>

            {availableBrands.length > 0 && (
              <div className="h-5 w-px bg-sand" aria-hidden />
            )}

            {/* Brand chips — top 8 */}
            {availableBrands.slice(0, 8).map((brand) => (
              <button
                key={brand}
                onClick={() =>
                  setSelectedBrand((prev) => (prev === brand ? "" : brand))
                }
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  selectedBrand === brand
                    ? "bg-green-eco text-white"
                    : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
                }`}
              >
                {brand}
              </button>
            ))}

            <div className="h-5 w-px bg-sand" aria-hidden />

            {/* Price range chips */}
            {PRICE_RANGES.map((range) => {
              const isActive = selectedPriceRange?.label === range.label;
              return (
                <button
                  key={range.label}
                  onClick={() =>
                    setSelectedPriceRange((prev) =>
                      prev?.label === range.label ? null : range
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-green-eco text-white"
                      : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}

            {/* Sort + count — right-aligned */}
            <div className="ml-auto flex items-center gap-3">
              {sortSelect}
              {!loading && !error && (
                <span className="whitespace-nowrap text-sm text-charcoal/50">
                  {filteredCount} produkt{filteredCount !== 1 ? "er" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Mobile filter button row                                             */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={() => setFilterDrawerOpen(true)}
          className="flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-charcoal"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
            />
          </svg>
          Filtre
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-green-eco px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-full border border-sand bg-white px-3 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {!loading && !error && (
          <span className="ml-auto text-sm text-charcoal/50">
            {filteredCount} stk
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Mobile filter drawer                                                 */}
      {/* ------------------------------------------------------------------- */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setFilterDrawerOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-charcoal">
                Filtre
              </h3>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-charcoal/60 hover:text-charcoal"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* In-store */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">
                  Tilgængelighed
                </p>
                <button
                  onClick={() => setFilter("inStore", !filters.inStore)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                    filters.inStore
                      ? "bg-green-eco text-white"
                      : "border border-sand text-charcoal hover:border-green-eco/40"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                    />
                  </svg>
                  Kun i butik
                </button>
              </div>

              {/* Brand */}
              {availableBrands.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">
                    Mærke
                  </p>
                  {brandChips}
                </div>
              )}

              {/* Price */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">
                  Pris
                </p>
                {priceChips}
              </div>
            </div>

            {/* Apply */}
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="mt-8 w-full rounded-full bg-green-eco py-3.5 text-sm font-bold text-white"
            >
              Vis {filteredCount} produkt{filteredCount !== 1 ? "er" : ""}
            </button>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  clearAll();
                  setFilterDrawerOpen(false);
                }}
                className="mt-3 w-full rounded-full border border-sand py-3 text-sm font-semibold text-charcoal/60 hover:text-charcoal"
              >
                Nulstil alle filtre
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category chips */}
      <CategoryChips
        value={filters.category}
        onChange={(v) => setFilter("category", v)}
      />

      {/* ------------------------------------------------------------------- */}
      {/* Active filter chips                                                  */}
      {/* ------------------------------------------------------------------- */}
      {(filters.model ||
        selectedBrand ||
        selectedPriceRange ||
        filters.inStore) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-charcoal/40">
            Aktive filtre:
          </span>
          {filters.model && (
            <ActiveChip
              label={filters.model}
              onRemove={() => setFilter("model", "")}
            />
          )}
          {selectedBrand && (
            <ActiveChip
              label={selectedBrand}
              onRemove={() => setSelectedBrand("")}
            />
          )}
          {selectedPriceRange && (
            <ActiveChip
              label={selectedPriceRange.label}
              onRemove={() => setSelectedPriceRange(null)}
            />
          )}
          {filters.inStore && (
            <ActiveChip
              label="Kun i butik"
              onRemove={() => setFilter("inStore", false)}
            />
          )}
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-green-eco hover:underline"
          >
            Ryd alle
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredCount === 0 && !error ? (
        <div className="rounded-2xl border-2 border-dashed border-sand bg-cream p-12 text-center">
          <p className="text-lg font-bold text-charcoal">
            Ingen produkter fundet
          </p>
          <p className="mt-2 text-sm text-charcoal/50">
            Prøv at ændre dine filtre eller søg efter noget andet
          </p>
          <button
            onClick={clearAll}
            className="mt-4 rounded-full bg-green-eco px-6 py-2.5 text-sm font-bold text-white"
          >
            Nulstil filtre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {displayedProducts.map((product) => (
            <AccessoryCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              category={product.category}
              brand={product.brand}
              price={product.price}
              sale_price={product.sale_price ?? null}
              image_url={product.image_url}
              store_stock={product.store_stock}
              online_stock={product.online_stock}
            />
          ))}
        </div>
      )}
    </div>
  );
}
