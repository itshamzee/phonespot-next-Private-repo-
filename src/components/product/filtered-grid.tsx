"use client";

import { useState } from "react";
import { CategoryFilters } from "@/components/product/category-filters";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { PromoCard, type PromoVariant } from "@/components/product/promo-card";
import type { ProductTemplate } from "@/lib/supabase/platform-types";

// ---------------------------------------------------------------------------
// Types — mirrors TemplateWithStock from product-queries.ts
// ---------------------------------------------------------------------------

export interface TemplateWithStock extends ProductTemplate {
  device_count: number;
  min_price: number | null;
  locations: { name: string; type: string; count: number }[];
  /** True when at least one listed device is PhoneSpot's own stock (not
   *  Foxway dropship) — see product-queries.ts. Drives sort order in
   *  CategoryFilters; never surfaced in the UI. */
  has_own_stock: boolean;
}

export interface PromoSlot {
  position: number; // Number of products before this editorial card.
  variant: PromoVariant;
  href: string;
  device?: "iPhone" | "iPad";
}

interface FilteredGridProps {
  templates: TemplateWithStock[];
  /** Optional heading rendered above the grid. */
  heading?: string;
  /** Promo cards to interleave between products at fixed positions. */
  promos?: PromoSlot[];
  /** Validated against available brands. Reset always clears it. */
  initialBrand?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilteredGrid({ templates, heading, promos, initialBrand }: FilteredGridProps) {
  const [visible, setVisible] = useState<TemplateWithStock[]>(templates);

  // Editorial tiles never count as products. Short catalogues place later
  // tiles at the end; a single filtered result stays free of editorial tiles.
  type GridItem =
    | { kind: "product"; template: TemplateWithStock }
    | { kind: "promo"; slot: PromoSlot };
  const gridItems: GridItem[] = visible.map((t) => ({ kind: "product", template: t }));
  if (promos && promos.length > 0) {
    const sorted = [...promos].sort((a, b) => a.position - b.position);
    let inserted = 0;
    for (const p of sorted) {
      if (visible.length < 2) continue;
      const at = Math.min(p.position, visible.length) + inserted;
      gridItems.splice(at, 0, { kind: "promo", slot: p });
      inserted++;
    }
  }

  const resultsId = "product-results";

  return (
    <div className="grid items-start gap-x-8 gap-y-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <CategoryFilters
        key={initialBrand?.toLowerCase() ?? "all-brands"}
        templates={templates}
        onFilter={setVisible}
        resultCount={visible.length}
        heading={heading}
        initialBrand={initialBrand}
      />

        <div
          id={resultsId}
          data-testid="product-results"
          className="min-w-0"
        >
          {/* Result count */}
          <div className="mb-4 hidden items-center justify-between lg:flex">
            {heading ? (
              <p className="text-sm font-semibold text-[#111111]">{heading}</p>
            ) : (
              <span />
            )}
            <p className="text-sm text-[#6E6E73]">
              {visible.length} {visible.length === 1 ? "model" : "modeller"}
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 h-12 w-12 text-[#C7C7CC]"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M8 11h6M11 8v6" />
              </svg>
              <p className="text-base font-semibold text-[#111111]">
                Ingen modeller fundet
              </p>
              <p className="mt-1 max-w-xs text-sm text-[#6E6E73]">
                Prøv at justere dine filtre for at se flere resultater.
              </p>
            </div>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3">
              {gridItems.map((item) =>
                item.kind === "product" ? (
                  <ProductGridCard
                    key={item.template.id}
                    slug={item.template.slug}
                    image={item.template.images[0]}
                    imageSizes="(min-width: 1320px) 310px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 360px) 50vw, 100vw"
                    title={item.template.display_name}
                    minPrice={item.template.min_price}
                    compareAtPrice={item.template.new_price}
                    deviceCount={item.template.device_count}
                    locations={item.template.locations}
                    brand={item.template.brand}
                    category={item.template.category}
                    specifications={item.template.specifications}
                  />
                ) : (
                  <PromoCard
                    key={`promo-${item.slot.variant}-${item.slot.position}`}
                    variant={item.slot.variant}
                    href={item.slot.href}
                    device={item.slot.device}
                  />
                ),
              )}
            </div>
          )}
      </div>
    </div>
  );
}
