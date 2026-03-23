"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TilbehoerCategoryHero } from "./tilbehoer-category-hero";
import { TilbehoerSidebar } from "./tilbehoer-sidebar";
import { TilbehoerMobileFilters } from "./tilbehoer-mobile-filters";
import { AccessoryGrid, SORT_OPTIONS } from "./accessory-grid";
import { PRICE_RANGES } from "@/lib/tilbehoer-filter-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TilbehoerLayoutProps {
  heroTitle: string;
  heroDescription?: string;
  productCount?: number;
  activeCategory: string; // "" for hub
}

// ---------------------------------------------------------------------------
// Type filter label map
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  "usb-c": "USB-C",
  lightning: "Lightning",
  traadloes: "Trådløs",
  magsafe: "MagSafe",
  earbuds: "Earbuds",
  "over-ear": "Over-ear",
  hoejttalere: "Højttalere",
  bil: "Bilholder",
  skrivebord: "Skrivebordsstander",
};

// ---------------------------------------------------------------------------
// FilterPill
// ---------------------------------------------------------------------------

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1 text-xs font-medium text-charcoal/70">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-charcoal/40 hover:text-charcoal"
        aria-label={`Fjern filter: ${label}`}
      >
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inner layout — uses useSearchParams so must be wrapped in Suspense
// ---------------------------------------------------------------------------

function TilbehoerLayoutInner({
  heroTitle,
  heroDescription,
  productCount,
  activeCategory,
}: TilbehoerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filteredCount, setFilteredCount] = useState<number | undefined>(
    undefined,
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Extract filter values from URL params
  const brand = searchParams.get("brand") ?? "";
  const model = searchParams.get("model") ?? "";
  const type = searchParams.get("type") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const priceRanges =
    searchParams
      .get("pris")
      ?.split(",")
      .filter(Boolean) ?? [];
  const inStore = searchParams.get("inStore") === "true";

  const hasActiveFilters =
    !!brand || !!model || !!type || priceRanges.length > 0 || inStore;

  // ---------------------------------------------------------------------------
  // URL helper functions
  // ---------------------------------------------------------------------------

  const buildUpdatedParams = useCallback(
    (updates: Record<string, string | null>): string => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("side");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    [searchParams],
  );

  const removeParam = useCallback(
    (...keys: string[]) => {
      const updates: Record<string, null> = {};
      for (const key of keys) {
        updates[key] = null;
      }
      router.push(pathname + buildUpdatedParams(updates), { scroll: false });
    },
    [router, pathname, buildUpdatedParams],
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      router.push(
        pathname + buildUpdatedParams({ [key]: value }),
        { scroll: false },
      );
    },
    [router, pathname, buildUpdatedParams],
  );

  const removePriceRange = useCallback(
    (value: string) => {
      const next = priceRanges.filter((p) => p !== value);
      const updates: Record<string, string | null> = {
        pris: next.length > 0 ? next.join(",") : null,
      };
      router.push(pathname + buildUpdatedParams(updates), { scroll: false });
    },
    [router, pathname, buildUpdatedParams, priceRanges],
  );

  const clearAll = useCallback(() => {
    router.push(
      pathname +
        buildUpdatedParams({
          brand: null,
          model: null,
          type: null,
          pris: null,
          inStore: null,
          sort: null,
        }),
      { scroll: false },
    );
  }, [router, pathname, buildUpdatedParams]);

  // ---------------------------------------------------------------------------
  // Derived labels
  // ---------------------------------------------------------------------------

  const typeLabel = type ? (TYPE_LABELS[type] ?? type) : "";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <TilbehoerCategoryHero
        title={heroTitle}
        description={heroDescription}
        productCount={filteredCount ?? productCount}
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-8">
          <TilbehoerSidebar activeCategory={activeCategory} />

          <main className="min-w-0 flex-1">
            {/* Top bar: filter pills + sort + mobile filter button */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {/* Active filter pills */}
              {brand && (
                <FilterPill
                  label={brand.charAt(0).toUpperCase() + brand.slice(1)}
                  onRemove={() => removeParam("brand", "model")}
                />
              )}
              {model && (
                <FilterPill
                  label={model}
                  onRemove={() => removeParam("model")}
                />
              )}
              {type && (
                <FilterPill
                  label={typeLabel}
                  onRemove={() => removeParam("type")}
                />
              )}
              {priceRanges.map((p) => {
                const rangeConfig = PRICE_RANGES.find((r) => r.value === p);
                const priceLabel = rangeConfig?.label ?? p;
                return (
                  <FilterPill
                    key={p}
                    label={priceLabel}
                    onRemove={() => removePriceRange(p)}
                  />
                );
              })}
              {inStore && (
                <FilterPill
                  label="Kun i butik"
                  onRemove={() => removeParam("inStore")}
                />
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-charcoal/40 underline hover:text-charcoal"
                >
                  Nulstil alle
                </button>
              )}

              {/* Spacer + sort + mobile filter trigger */}
              <div className="ml-auto flex items-center gap-3">
                {/* Sort dropdown */}
                <select
                  value={sort}
                  onChange={(e) => updateParam("sort", e.target.value)}
                  className="rounded-lg border border-sand bg-white px-3 py-2 text-sm text-charcoal"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {/* Mobile filter button — hidden on lg+ */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-2 text-sm font-medium text-charcoal lg:hidden"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5h14M6 10h8M9 15h2"
                    />
                  </svg>
                  Filter
                </button>
              </div>
            </div>

            <AccessoryGrid
              category={activeCategory || undefined}
              brand={brand || undefined}
              model={model || undefined}
              type={type || undefined}
              sort={sort || undefined}
              priceRanges={priceRanges.length > 0 ? priceRanges : undefined}
              inStore={inStore}
              onCountChange={setFilteredCount}
            />
          </main>
        </div>
      </div>

      <TilbehoerMobileFilters
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        activeCategory={activeCategory}
        productCount={filteredCount ?? productCount ?? 0}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Public export — wraps inner component with Suspense for useSearchParams
// ---------------------------------------------------------------------------

export function TilbehoerLayout(props: TilbehoerLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-8 w-64 animate-pulse rounded-full bg-sand" />
        </div>
      }
    >
      <TilbehoerLayoutInner {...props} />
    </Suspense>
  );
}
