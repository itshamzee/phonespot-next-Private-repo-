"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { DeviceType, RepairBrand, RepairModel } from "@/lib/supabase/types";

type ModelWithBrand = RepairModel & { brand_slug: string; brand_name: string };

// ---------------------------------------------------------------------------
// Parent brand groupings
// ---------------------------------------------------------------------------

const PARENT_BRAND_MAP: Record<string, string> = {
  iphone: "apple",
  ipad: "apple",
  macbook: "apple",
  "apple-watch": "apple",
  samsung: "samsung",
  "google-pixel": "google",
  oneplus: "oneplus",
  huawei: "huawei",
  sony: "sony",
  xiaomi: "xiaomi",
  motorola: "motorola",
};

const PARENT_BRAND_META: Record<string, { name: string; logo: string }> = {
  apple: { name: "Apple", logo: "/images/brands/apple.svg" },
  samsung: { name: "Samsung", logo: "/images/brands/samsung.svg" },
  google: { name: "Google", logo: "/images/brands/google.svg" },
  oneplus: { name: "OnePlus", logo: "/images/brands/oneplus.svg" },
  huawei: { name: "Huawei", logo: "/images/brands/huawei.svg" },
  sony: { name: "Sony", logo: "/images/brands/sony.svg" },
  xiaomi: { name: "Xiaomi", logo: "/images/brands/xiaomi.svg" },
  motorola: { name: "Motorola", logo: "/images/brands/motorola.svg" },
};

const PARENT_BRAND_ORDER = [
  "apple",
  "samsung",
  "google",
  "oneplus",
  "huawei",
  "xiaomi",
  "sony",
  "motorola",
];

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  smartphone: "Telefon",
  tablet: "Tablet",
  laptop: "Bærbar",
  watch: "Smartwatch",
  console: "Konsol",
};

const DEVICE_TYPE_ICONS: Record<DeviceType, React.ReactNode> = {
  smartphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  tablet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  laptop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M4 5h16a1 1 0 011 1v10H3V6a1 1 0 011-1z" />
      <path d="M2 17h20l-1 3H3l-1-3z" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="12" cy="12" r="6" />
      <path d="M9 2h6M9 22h6M12 6v6l3 3" />
    </svg>
  ),
  console: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="1" />
      <circle cx="18" cy="10" r="1" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BrandPicker({ brands, models = [] }: { brands: RepairBrand[]; models?: ModelWithBrand[] }) {
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return models
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, models]);

  const showResults = isFocused && query.length >= 2;

  // Group brands by parent company
  const parentGroups = new Map<string, RepairBrand[]>();
  for (const brand of brands) {
    const parentKey = PARENT_BRAND_MAP[brand.slug] ?? brand.slug;
    if (!parentGroups.has(parentKey)) parentGroups.set(parentKey, []);
    parentGroups.get(parentKey)!.push(brand);
  }

  // Ordered list of parent brands that actually have data
  const orderedParents = PARENT_BRAND_ORDER.filter((key) => parentGroups.has(key));
  for (const key of parentGroups.keys()) {
    if (!orderedParents.includes(key)) orderedParents.push(key);
  }

  const selectedCollections = selectedParent ? parentGroups.get(selectedParent) ?? [] : [];

  return (
    <div>
      {/* Search bar */}
      <div ref={searchRef} className="relative mb-8">
        <div className={`relative flex items-center rounded-2xl border bg-white transition-all ${
          isFocused ? "border-green-eco shadow-lg shadow-green-eco/10" : "border-soft-grey"
        }`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="ml-5 h-5 w-5 shrink-0 text-charcoal/30">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Søg efter model, f.eks. &quot;iPhone 15 Pro&quot; eller &quot;Galaxy S24&quot;"
            className="w-full bg-transparent px-4 py-4 text-sm text-charcoal outline-none placeholder:text-charcoal/30"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setIsFocused(false); }}
              className="mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal/10 text-charcoal/50 transition-colors hover:bg-charcoal/20"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-soft-grey bg-white shadow-xl"
            >
              {searchResults.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-charcoal/40">
                  Ingen modeller fundet for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-soft-grey">
                  {searchResults.map((model) => (
                    <Link
                      key={model.id}
                      href={`/reparation/${model.brand_slug}/${model.slug}`}
                      onClick={() => { setQuery(""); setIsFocused(false); }}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-green-eco/[0.04]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal/[0.04]">
                        {PARENT_BRAND_META[PARENT_BRAND_MAP[model.brand_slug] ?? model.brand_slug]?.logo ? (
                          <img
                            src={PARENT_BRAND_META[PARENT_BRAND_MAP[model.brand_slug] ?? model.brand_slug].logo}
                            alt=""
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <span className="text-xs font-bold text-charcoal/40">{model.brand_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold text-charcoal">{model.name}</p>
                        <p className="text-xs text-charcoal/40">{model.brand_name}</p>
                      </div>
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-charcoal/20">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step 1: Parent brands */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {orderedParents.map((parentKey) => {
          const meta = PARENT_BRAND_META[parentKey];
          const collections = parentGroups.get(parentKey) ?? [];
          const isSelected = selectedParent === parentKey;
          const isSingle = collections.length === 1;

          // Single-collection brands link directly
          if (isSingle) {
            return (
              <Link
                key={parentKey}
                href={`/reparation/${collections[0].slug}`}
                className="group relative flex flex-col items-center gap-4 rounded-2xl border border-soft-grey bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-eco hover:shadow-lg hover:shadow-green-eco/10"
              >
                {meta?.logo ? (
                  <img
                    src={meta.logo}
                    alt={meta.name}
                    className="h-12 w-12 object-contain transition-transform group-hover:scale-110"
                  />
                ) : (
                  <span className="font-display text-3xl font-bold text-charcoal/50 group-hover:text-green-eco">
                    {(meta?.name ?? parentKey).charAt(0)}
                  </span>
                )}
                <span className="text-center font-display text-lg font-bold text-charcoal transition-colors group-hover:text-green-eco">
                  {meta?.name ?? parentKey}
                </span>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="absolute right-4 top-4 h-4 w-4 text-charcoal/15 transition-all group-hover:text-green-eco group-hover:translate-x-0.5"
                >
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </Link>
            );
          }

          // Multi-collection brands open the collection picker
          return (
            <button
              key={parentKey}
              onClick={() => setSelectedParent(isSelected ? null : parentKey)}
              className={`group relative flex flex-col items-center gap-4 rounded-2xl border p-6 transition-all duration-200 ${
                isSelected
                  ? "border-green-eco bg-green-eco/[0.04] shadow-md shadow-green-eco/10"
                  : "border-soft-grey bg-white hover:-translate-y-0.5 hover:border-green-eco hover:shadow-lg hover:shadow-green-eco/10"
              }`}
            >
              {meta?.logo ? (
                <img
                  src={meta.logo}
                  alt={meta.name}
                  className={`h-12 w-12 object-contain transition-transform ${
                    isSelected ? "scale-110" : "group-hover:scale-110"
                  }`}
                />
              ) : (
                <span className="font-display text-3xl font-bold text-charcoal/50 group-hover:text-green-eco">
                  {(meta?.name ?? parentKey).charAt(0)}
                </span>
              )}
              <span
                className={`text-center font-display text-lg font-bold transition-colors ${
                  isSelected ? "text-green-eco" : "text-charcoal group-hover:text-green-eco"
                }`}
              >
                {meta?.name ?? parentKey}
              </span>
              {/* Chevron */}
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`absolute right-4 top-4 h-4 w-4 transition-all duration-200 ${
                  isSelected
                    ? "rotate-180 text-green-eco"
                    : "text-charcoal/15 group-hover:text-green-eco"
                }`}
              >
                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
              {/* Active indicator */}
              {isSelected && (
                <motion.div
                  layoutId="brand-active"
                  className="absolute -bottom-2 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-green-eco"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Step 2: Collections for selected brand */}
      <AnimatePresence mode="wait">
        {selectedParent && selectedCollections.length > 0 && (
          <motion.div
            key={selectedParent}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-2xl border border-green-eco/20 bg-white p-6">
              <p className="mb-5 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[2px] text-charcoal/40">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-green-eco">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
                Vælg kollektion
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {selectedCollections.map((brand, i) => (
                  <motion.div
                    key={brand.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                  >
                    <Link
                      href={`/reparation/${brand.slug}`}
                      className="group flex items-center gap-4 rounded-xl border border-soft-grey bg-warm-white p-5 transition-all duration-200 hover:border-green-eco hover:bg-green-eco/[0.04] hover:shadow-md hover:shadow-green-eco/10"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-charcoal/[0.05] text-charcoal/40 transition-colors group-hover:bg-green-eco/15 group-hover:text-green-eco">
                        {DEVICE_TYPE_ICONS[brand.device_type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-bold text-charcoal group-hover:text-green-eco">
                          {brand.name}
                        </p>
                        <p className="text-sm text-charcoal/40">
                          {DEVICE_TYPE_LABELS[brand.device_type]}
                        </p>
                      </div>
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 shrink-0 text-charcoal/20 transition-all group-hover:text-green-eco group-hover:translate-x-0.5"
                      >
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
