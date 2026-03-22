"use client";

import { DevicePicker } from "./device-picker";
import type { TilbehoerCategory } from "@/lib/tilbehoer-config";

interface TilbehoerCategoryHeroProps {
  category: TilbehoerCategory;
  productCount: number;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function TilbehoerCategoryHero({
  category,
  productCount,
  selectedModel,
  onModelChange,
}: TilbehoerCategoryHeroProps) {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center md:py-20">
        {/* Category badge */}
        <span className="inline-flex rounded-full bg-green-eco/10 px-4 py-1 text-sm font-medium text-green-eco">
          Tilbehør
        </span>

        {/* Title */}
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-charcoal md:text-5xl">
          {category.label}
        </h1>

        {/* Description */}
        {category.heroDescription && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-charcoal/70">
            {category.heroDescription}
          </p>
        )}

        {/* Product count */}
        {productCount > 0 && (
          <p className="mt-3 text-sm text-charcoal/50">{productCount} produkter</p>
        )}

        {/* DevicePicker — only for device-specific categories */}
        {category.deviceSpecific && (
          <div className="mx-auto mt-8 max-w-2xl text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              Filtrer efter din model
            </p>
            <DevicePicker
              selectedModel={selectedModel}
              onChange={onModelChange}
              compact
            />
          </div>
        )}

        {/* Trust row */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-semibold text-charcoal/50">
          <span>36 mdr. garanti</span>
          <span>14 dages returret</span>
          <span>Fri fragt over 499 kr.</span>
        </div>
      </div>
    </section>
  );
}
