"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeviceImage } from "@/components/repair/device-image";
import type { DeviceType } from "@/lib/supabase/types";

export type ModelCardData = {
  slug: string;
  name: string;
  series: string | null;
  cheapestPrice: number | null;
  brandSlug: string;
  imageUrl: string | null;
  deviceType: DeviceType;
};

type SeriesGroup = {
  series: string;
  models: ModelCardData[];
};

function groupBySeries(models: ModelCardData[]): SeriesGroup[] {
  const groups: Map<string, ModelCardData[]> = new Map();
  for (const m of models) {
    const key = m.series ?? "__ungrouped__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return Array.from(groups.entries()).map(([series, models]) => ({
    series: series === "__ungrouped__" ? "" : series,
    models,
  }));
}

function ModelCard({ model }: { model: ModelCardData }) {
  return (
    <Link
      href={`/reparation/${model.brandSlug}/${model.slug}`}
      className="group relative flex flex-col items-center rounded-2xl border border-soft-grey bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-eco hover:shadow-lg hover:shadow-green-eco/10"
    >
      {/* Device image */}
      <div className="mb-4 h-40 w-28">
        <DeviceImage
          brandSlug={model.brandSlug}
          deviceType={model.deviceType}
          imageUrl={model.imageUrl}
          modelName={model.name}
          className="h-full w-full"
        />
      </div>

      {/* Model name */}
      <span className="text-center font-display text-lg font-bold leading-tight text-charcoal transition-colors group-hover:text-green-eco">
        {model.name}
      </span>

      {/* Price badge */}
      {model.cheapestPrice != null && model.cheapestPrice > 0 && (
        <span className="mt-2.5 rounded-full bg-green-eco/10 px-3.5 py-1.5 text-sm font-bold text-green-eco">
          fra {model.cheapestPrice} kr.
        </span>
      )}

      {/* CTA hint */}
      <span className="mt-2.5 flex items-center gap-1 text-sm font-medium text-gray transition-colors group-hover:text-green-eco">
        Se priser
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </span>

      {/* Guarantee micro-badge — visible on hover */}
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-eco/10 px-2.5 py-1 text-xs font-bold text-green-eco opacity-0 transition-opacity group-hover:opacity-100">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <path d="M8 1l6 2.5v4c0 3.5-2.5 6.5-6 8-3.5-1.5-6-4.5-6-8v-4L8 1z" />
        </svg>
        Garanti
      </span>
    </Link>
  );
}

export function ModelGrid({ models, brandName }: { models: ModelCardData[]; brandName: string }) {
  const [search, setSearch] = useState("");

  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const hasSeries = models.some((m) => m.series);
  const groups = useMemo(() => groupBySeries(filtered), [filtered]);

  return (
    <>
      {/* Search bar */}
      <div className="sticky top-0 z-10 -mx-4 bg-warm-white/95 px-4 pb-6 pt-2 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Søg efter ${brandName} model...`}
              className="w-full rounded-xl border border-soft-grey bg-white py-3.5 pl-12 pr-4 text-charcoal shadow-sm placeholder:text-gray/60 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray hover:text-charcoal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray">
            {filtered.length} {filtered.length === 1 ? "model" : "modeller"} fundet
          </p>
        </div>
      </div>

      {/* Model grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold text-charcoal">
            Ingen modeller fundet for &quot;{search}&quot;
          </p>
          <p className="mt-2 text-sm text-gray">
            Prøv at søge efter et andet modelnavn
          </p>
        </div>
      ) : hasSeries && !search ? (
        /* Grouped by series */
        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.series || "other"}>
              {group.series && (
                <h3 className="mb-5 font-display text-xl font-bold uppercase tracking-wide text-charcoal">
                  {group.series}
                </h3>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.models.map((model) => (
                  <ModelCard key={model.slug} model={model} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat grid (no series or active search) */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((model) => (
            <ModelCard key={model.slug} model={model} />
          ))}
        </div>
      )}
    </>
  );
}
