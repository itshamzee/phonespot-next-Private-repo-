"use client";

import { useState } from "react";
import { CategoryFilters } from "@/components/product/category-filters";
import { ProductGridCard } from "@/components/product/product-grid-card";
import type { ProductTemplate } from "@/lib/supabase/platform-types";

// ---------------------------------------------------------------------------
// Types — mirrors TemplateWithStock from product-queries.ts
// ---------------------------------------------------------------------------

export interface TemplateWithStock extends ProductTemplate {
  device_count: number;
  min_price: number | null;
  locations: { name: string; type: string; count: number }[];
}

interface FilteredGridProps {
  templates: TemplateWithStock[];
  /** Optional heading rendered above the grid. */
  heading?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilteredGrid({ templates, heading }: FilteredGridProps) {
  const [visible, setVisible] = useState<TemplateWithStock[]>(templates);

  return (
    <div>
      {/* Mobile filter bar — sits above the grid */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        {heading && (
          <p className="text-sm text-[#6E6E73]">
            {visible.length} af {templates.length} modeller
          </p>
        )}
        <CategoryFilters templates={templates} onFilter={setVisible} />
      </div>

      <div className="flex items-start gap-8">
        {/* Desktop sidebar */}
        <CategoryFilters templates={templates} onFilter={setVisible} />

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
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((t) => (
                <ProductGridCard
                  key={t.id}
                  slug={t.slug}
                  image={t.images[0]}
                  title={t.display_name}
                  minPrice={t.min_price}
                  deviceCount={t.device_count}
                  locations={t.locations}
                  brand={t.brand}
                  category={t.category}
                  specifications={t.specifications}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
