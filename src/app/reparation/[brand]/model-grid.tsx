"use client";

import { useState } from "react";
import Link from "next/link";
import { DeviceImage } from "@/components/repair/device-image";
import type { DeviceType } from "@/lib/supabase/types";

export type ModelCardData = {
  slug: string;
  name: string;
  cheapestPrice: number | null;
  brandSlug: string;
  imageUrl: string | null;
  deviceType: DeviceType;
};

export function ModelGrid({ models, brandName }: { models: ModelCardData[]; brandName: string }) {
  const [search, setSearch] = useState("");

  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

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
              placeholder={`Soeg efter ${brandName} model...`}
              className="w-full rounded-2xl border border-soft-grey bg-white py-4 pl-12 pr-4 text-charcoal shadow-sm placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20"
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
          <p className="mt-2 text-center text-sm text-gray">
            {filtered.length} {filtered.length === 1 ? "model" : "modeller"} fundet
          </p>
        </div>
      </div>

      {/* Model grid — dense 5 columns like telerepair */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold text-charcoal">
            Ingen modeller fundet for &quot;{search}&quot;
          </p>
          <p className="mt-2 text-sm text-gray">
            Proev at soege efter et andet modelnavn
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((model) => (
            <Link
              key={model.slug}
              href={`/reparation/${model.brandSlug}/${model.slug}`}
              className="group flex flex-col items-center rounded-2xl border border-soft-grey bg-white p-4 transition-all hover:border-green-eco hover:shadow-md"
            >
              {/* Device image */}
              <div className="mb-3 h-28 w-20">
                <DeviceImage
                  brandSlug={model.brandSlug}
                  deviceType={model.deviceType}
                  imageUrl={model.imageUrl}
                  modelName={model.name}
                  className="h-full w-full"
                />
              </div>

              {/* Model name */}
              <span className="text-center font-display text-sm font-bold leading-tight text-charcoal transition-colors group-hover:text-green-eco">
                {model.name}
              </span>

              {/* Price badge */}
              {model.cheapestPrice != null && model.cheapestPrice > 0 && (
                <span className="mt-2 rounded-full bg-green-eco/10 px-3 py-1 text-xs font-semibold text-green-eco">
                  fra {model.cheapestPrice} DKK
                </span>
              )}

              {/* CTA hint */}
              <span className="mt-2 flex items-center gap-1 text-xs font-medium text-gray transition-colors group-hover:text-green-eco">
                Se priser
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 transition-transform group-hover:translate-x-0.5">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
