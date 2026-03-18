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
  brand: string;
  model: string;
  inStore: boolean;
}

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
// Filter chips for categories
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
            ? "bg-charcoal text-white"
            : "border border-sand bg-white text-charcoal hover:border-charcoal/30"
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
              ? "bg-charcoal text-white"
              : "border border-sand bg-white text-charcoal hover:border-charcoal/30"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand select
// ---------------------------------------------------------------------------

function BrandSelect({
  brands,
  value,
  onChange,
}: {
  brands: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (brands.length === 0) return null;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-sand bg-white py-2 pl-4 pr-10 text-sm font-semibold text-charcoal focus:border-green-eco focus:outline-none"
      >
        <option value="">Alle brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-4 w-4 text-charcoal/40"
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white">
      <div className="aspect-square animate-pulse bg-cream" />
      <div className="p-4 space-y-2">
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

export function AccessoryGrid({ externalModel, initialCategory }: AccessoryGridProps = {}) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: initialCategory ?? "",
    brand: "",
    model: externalModel ?? "",
    inStore: false,
  });
  const [products, setProducts] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 350);
  const abortRef = useRef<AbortController | null>(null);

  // Sync external model prop changes
  useEffect(() => {
    if (externalModel !== undefined) {
      setFilter("model", externalModel);
    }
  }, [externalModel]);

  // Derive available brand list from currently loaded products before brand filter
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [products]);

  useEffect(() => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.brand) params.set("brand", filters.brand);
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
        setError(
          err instanceof Error ? err.message : "Noget gik galt"
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters.category, filters.brand, filters.model, debouncedSearch, filters.inStore]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const activeFilterCount = [
    filters.category !== "",
    filters.brand !== "",
    filters.model !== "",
    filters.inStore,
    debouncedSearch !== "",
  ].filter(Boolean).length;

  const POPULAR_MODELS = [
    "iPhone 16", "iPhone 15", "iPhone 14", "iPhone 13",
    "Samsung S25", "Samsung S24", "Samsung A55", "Samsung A35",
  ];

  return (
    <div className="space-y-6">
      {/* Model filter — only shown when no external picker */}
      {externalModel === undefined && (
        <div className="rounded-2xl border border-sand bg-cream p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            Find tilbehør til din mobil
          </p>
          <div className="relative mb-3">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-charcoal/40">
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                    ? "bg-charcoal text-white"
                    : "bg-white border border-sand text-charcoal hover:border-charcoal/30"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top bar: search + store toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
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
            placeholder="Sog efter tilbehor..."
            className="w-full rounded-full border border-sand bg-white py-3 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
          />
        </div>

        {/* Brand select */}
        <BrandSelect
          brands={availableBrands}
          value={filters.brand}
          onChange={(v) => setFilter("brand", v)}
        />

        {/* In-store toggle */}
        <button
          onClick={() => setFilter("inStore", !filters.inStore)}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
            filters.inStore
              ? "bg-green-eco text-white"
              : "border border-sand bg-white text-charcoal hover:border-green-eco/40"
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

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button
            onClick={() =>
              setFilters({ search: "", category: "", brand: "", model: "", inStore: false })
            }
            className="rounded-full border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-charcoal/60 hover:text-charcoal"
          >
            Ryd filtre ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Category chips */}
      <CategoryChips
        value={filters.category}
        onChange={(v) => setFilter("category", v)}
      />

      {/* Results count */}
      {!loading && !error && (
        <p className="text-sm text-charcoal/50">
          {products.length === 0
            ? "Ingen produkter"
            : externalModel
              ? `${products.length} produkt${products.length !== 1 ? "er" : ""} til ${externalModel}`
              : `${products.length} produkt${products.length !== 1 ? "er" : ""}`}
        </p>
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
      ) : products.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand text-charcoal/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <p className="font-semibold text-charcoal">Ingen produkter fundet</p>
          <p className="mt-1 text-sm text-charcoal/50">
            Prøv at justere dine filtre eller søg efter noget andet.
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={() =>
                setFilters({
                  search: "",
                  category: "",
                  brand: "",
                  model: "",
                  inStore: false,
                })
              }
              className="mt-4 rounded-full border border-sand bg-white px-5 py-2.5 text-sm font-semibold text-charcoal hover:border-green-eco hover:text-green-eco"
            >
              Ryd alle filtre
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <AccessoryCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              category={product.category}
              brand={product.brand}
              price={product.price}
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
