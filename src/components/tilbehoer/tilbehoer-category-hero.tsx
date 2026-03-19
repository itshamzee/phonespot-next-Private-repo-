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
    <section className="relative overflow-hidden bg-charcoal">
      {/* Dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 30px, currentColor 30px, currentColor 31px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
        {/* Green accent line */}
        <div className="mb-4 h-1 w-10 bg-green-eco" />

        {/* Category label */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-eco">
          {category.label}
        </p>

        {/* Heading */}
        <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
          {category.label}
        </h1>

        {/* Description */}
        <p className="mt-3 max-w-xl text-base text-white/60">
          {category.heroDescription}
        </p>

        {/* Product count badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-eco opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-eco" />
          </span>
          <span className="text-xs font-semibold text-white/80">
            {productCount} produkter
          </span>
        </div>

        {/* DevicePicker — only for device-specific categories */}
        {category.deviceSpecific && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
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
        <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-white/50">
          <span>✓ 36 mdr. garanti</span>
          <span>✓ 14 dages returret</span>
          <span>✓ Fri fragt over 499 kr.</span>
        </div>
      </div>
    </section>
  );
}
