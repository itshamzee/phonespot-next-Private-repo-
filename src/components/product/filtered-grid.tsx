"use client";

import { useState } from "react";
import { CategoryFilters } from "@/components/product/category-filters";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { PromoCard } from "@/components/product/promo-card";
import type { ProductTemplate } from "@/lib/supabase/platform-types";

// ---------------------------------------------------------------------------
// Types — mirrors TemplateWithStock from product-queries.ts
// ---------------------------------------------------------------------------

export interface TemplateWithStock extends ProductTemplate {
  device_count: number;
  min_price: number | null;
  locations: { name: string; type: string; count: number }[];
}

interface PromoSlot {
  position: number; // zero-indexed insertion point in the visible array
  variant: "screen-protector" | "weekly-deal" | "trust";
  href: string;
}

interface FilteredGridProps {
  templates: TemplateWithStock[];
  /** Optional heading rendered above the grid. */
  heading?: string;
  /** Promo cards to interleave between products at fixed positions. */
  promos?: PromoSlot[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilteredGrid({ templates, heading, promos }: FilteredGridProps) {
  const [visible, setVisible] = useState<TemplateWithStock[]>(templates);

  // Build the render-list with promo cards spliced in at the configured slots.
  // Sorted descending so earlier insertions don't shift later positions.
  type GridItem =
    | { kind: "product"; template: TemplateWithStock }
    | { kind: "promo"; slot: PromoSlot };
  const gridItems: GridItem[] = visible.map((t) => ({ kind: "product", template: t }));
  if (promos && promos.length > 0) {
    const sorted = [...promos].sort((a, b) => a.position - b.position);
    let inserted = 0;
    for (const p of sorted) {
      const at = Math.min(p.position + inserted, gridItems.length);
      gridItems.splice(at, 0, { kind: "promo", slot: p });
      inserted++;
    }
  }

  return (
    <div>
      {/* Mobile filter bar — sticky so it remains reachable while
          scrolling through products. NB: deliberately no `backdrop-blur`
          here — backdrop-filter creates a containing block, which pulls
          the CategoryFilters drawer (position:fixed) out of the viewport
          context and renders it inline instead of overlaying. */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-[#E5E5EA] bg-white px-4 py-3 lg:hidden">
        {heading && (
          <p className="text-sm font-medium text-[#111111]">
            {visible.length} {visible.length === 1 ? "model" : "modeller"}
          </p>
        )}
        <CategoryFilters templates={templates} onFilter={setVisible} />
      </div>

      <div className="flex items-start gap-8">
        {/* Desktop sidebar — wrapped so its mobile-button portion (rendered
            via lg:hidden inside CategoryFilters) doesn't double up with the
            sticky bar above on mobile. */}
        <div className="hidden lg:block">
          <CategoryFilters templates={templates} onFilter={setVisible} />
        </div>

        {/* Grid area */}
        <div className="min-w-0 flex-1">
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {gridItems.map((item, idx) =>
                item.kind === "product" ? (
                  <ProductGridCard
                    key={item.template.id}
                    slug={item.template.slug}
                    image={item.template.images[0]}
                    title={item.template.display_name}
                    minPrice={item.template.min_price}
                    deviceCount={item.template.device_count}
                    locations={item.template.locations}
                    brand={item.template.brand}
                    category={item.template.category}
                    specifications={item.template.specifications}
                  />
                ) : (
                  <PromoCard
                    key={`promo-${idx}`}
                    variant={item.slot.variant}
                    href={item.slot.href}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
