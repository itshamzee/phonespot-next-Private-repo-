"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Accessory } from "@/lib/supabase/platform-types";
import { AccessoryCard } from "./accessory-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption = "recommended" | "price-asc" | "price-desc" | "newest";

interface PriceRange {
  label: string;
  min: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Anbefalet" },
  { value: "price-asc", label: "Pris: Lav → Høj" },
  { value: "price-desc", label: "Pris: Høj → Lav" },
  { value: "newest", label: "Nyeste" },
];

// Canonical price range definitions keyed by the string token used in URL params
const PRICE_RANGE_MAP: Record<string, PriceRange> = {
  "0-9999": { label: "Under 100 kr", min: 0, max: 9999 },
  "10000-29999": { label: "100–299 kr", min: 10000, max: 29999 },
  "30000-49999": { label: "300–499 kr", min: 30000, max: 49999 },
  "50000-999999": { label: "500+ kr", min: 50000, max: Infinity },
};

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
  category?: string;
  brand?: string;
  model?: string;
  type?: string;
  sort?: string;
  priceRanges?: string[]; // e.g. ["0-9999", "10000-29999"]
  inStore?: boolean;
  onCountChange?: (count: number) => void;
}

export function AccessoryGrid({
  category,
  brand,
  model,
  type,
  sort = "recommended",
  priceRanges = [],
  inStore = false,
  onCountChange,
}: AccessoryGridProps) {
  const [products, setProducts] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Fetch from API whenever API-level props change
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (type) params.set("type", type);
    if (inStore) params.set("inStore", "true");

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
  }, [category, brand, model, type, inStore]);

  // Client-side: price filter + sort
  const displayedProducts = useMemo(() => {
    let result = products;

    // Price filtering from priceRanges prop tokens
    if (priceRanges.length > 0) {
      const ranges = priceRanges
        .map((key) => PRICE_RANGE_MAP[key])
        .filter((r): r is PriceRange => r !== undefined);

      if (ranges.length > 0) {
        result = result.filter((p) => {
          const price =
            p.sale_price != null && p.sale_price < p.price
              ? p.sale_price
              : p.price;
          return ranges.some((r) => price >= r.min && price <= r.max);
        });
      }
    }

    const copy = [...result];
    switch (sort as SortOption) {
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
  }, [products, priceRanges, sort]);

  // Notify parent of filtered count
  useEffect(() => {
    if (!loading) {
      onCountChange?.(displayedProducts.length);
    }
  }, [displayedProducts.length, loading, onCountChange]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (displayedProducts.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-sand bg-cream p-12 text-center">
        <p className="text-lg font-bold text-charcoal">
          Ingen produkter fundet
        </p>
        <p className="mt-2 text-sm text-charcoal/50">
          Prøv at ændre dine filtre
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
  );
}
