"use client";

import { useState } from "react";
import Link from "next/link";

export type ModelCardData = {
  slug: string;
  name: string;
  cheapestPrice: number | null;
  brandSlug: string;
};

export function ModelGrid({ models }: { models: ModelCardData[] }) {
  const [search, setSearch] = useState("");

  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {/* Search input */}
      <div className="mx-auto mb-10 max-w-md">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sog efter model..."
            className="w-full rounded-xl border border-soft-grey bg-white py-3 pl-12 pr-4 text-charcoal placeholder:text-gray-400 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20"
          />
        </div>
      </div>

      {/* Model grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">
          Ingen modeller fundet for &quot;{search}&quot;
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((model) => (
            <Link
              key={model.slug}
              href={`/reparation/${model.brandSlug}/${model.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-soft-grey bg-white p-5 transition-all hover:border-green-eco hover:shadow-md"
            >
              <div>
                <span className="font-display text-lg font-bold text-charcoal transition-colors group-hover:text-green-eco">
                  {model.name}
                </span>
                {model.cheapestPrice != null && (
                  <p className="mt-1 text-sm font-semibold text-green-eco">
                    fra {model.cheapestPrice} DKK
                  </p>
                )}
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-green-eco"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
