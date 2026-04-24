"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  TILBEHOER_CATEGORIES,
  TILBEHOER_DEVICES,
  DEVICE_BRANDS,
  type DeviceBrand,
} from "@/lib/tilbehoer-config";
import { getCategoryFilters, PRICE_RANGES } from "@/lib/tilbehoer-filter-config";

interface TilbehoerSidebarProps {
  activeCategory: string; // "" for hub/all, or "covers", "opladere", etc.
}

// ---------------------------------------------------------------------------
// Small SVG icons
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <circle cx="8.5" cy="8.5" r="5" strokeLinecap="round" />
      <path strokeLinecap="round" d="M13 13l3.5 3.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-[11px] font-bold uppercase tracking-widest text-charcoal/35">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function Divider() {
  return <div className="border-t-2 border-sand/70" />;
}

// ---------------------------------------------------------------------------
// How many top devices to show before "Vis alle" per brand
// ---------------------------------------------------------------------------
const DEVICES_VISIBLE_DEFAULT = 6;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TilbehoerSidebar({ activeCategory }: TilbehoerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePrices = searchParams.get("pris")?.split(",").filter(Boolean) ?? [];
  const activeModel = searchParams.get("model") ?? "";
  const activeSearch = searchParams.get("search") ?? "";

  // Track which brand sections are expanded beyond default
  const [expandedBrands, setExpandedBrands] = useState<Set<DeviceBrand>>(new Set());
  // Track whether the entire device section is collapsed
  const [devicesCollapsed, setDevicesCollapsed] = useState(false);

  // ---------------------------------------------------------------------------
  // URL helpers
  // ---------------------------------------------------------------------------

  const buildParams = useCallback(
    (updates: Record<string, string | null>): string => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("side");
      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    [searchParams],
  );

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      router.push(pathname + buildParams(updates), { scroll: false });
    },
    [router, pathname, buildParams],
  );

  function toggleLinkFilter(key: string, value: string, clearKeys?: string[]) {
    const currentValue = searchParams.get(key) ?? "";
    const isActive = currentValue === value;
    const updates: Record<string, string | null> = {
      [key]: isActive ? null : value,
    };
    if (clearKeys) {
      for (const k of clearKeys) updates[k] = null;
    }
    navigate(updates);
  }

  function togglePriceRange(value: string) {
    const next = activePrices.includes(value)
      ? activePrices.filter((v) => v !== value)
      : [...activePrices, value];
    navigate({ pris: next.length > 0 ? next.join(",") : null });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    navigate({ search: val || null });
  }

  function toggleExpandBrand(brand: DeviceBrand) {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Category-specific filters
  // ---------------------------------------------------------------------------

  const categoryFilters = activeCategory ? getCategoryFilters(activeCategory) : null;

  // Whether to show the device model section (only for device-specific categories)
  const isDeviceSpecific =
    activeCategory === "covers" || activeCategory === "skaermbeskyttelse";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto space-y-5 pb-6 pr-1">

        {/* ------------------------------------------------------------------ */}
        {/* SEARCH                                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
          <input
            type="search"
            value={activeSearch}
            onChange={handleSearchChange}
            placeholder="Søg tilbehør..."
            className="w-full rounded-xl border border-sand bg-white py-2.5 pl-9 pr-3 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all"
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SPOT BESKYTTELSESGLAS PROMO — compact card                           */}
        {/* ------------------------------------------------------------------ */}
        <Link
          href="/beskyttelsesglas"
          className="group relative block overflow-hidden rounded-xl bg-[#1A3D2E] p-4 transition-all hover:bg-[#2a5c47]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-3 -bottom-5 select-none font-display text-[5rem] font-black leading-none text-white/[0.08]"
          >
            9H
          </div>
          <div className="relative">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">9H hærdet</p>
            <p className="mt-1 font-display text-sm font-bold leading-tight text-white">
              Beskyttelsesglas
              <br />
              til din enhed
            </p>
            <p className="mt-2 text-[11px] text-white/70">Fra 199 kr · gratis montering</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white">
              Se alle
              <svg aria-hidden className="h-3 w-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </Link>

        {/* ------------------------------------------------------------------ */}
        {/* KATEGORIER                                                           */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <SectionHeading>Kategorier</SectionHeading>
          <nav className="mt-3 space-y-0.5">
            <Link
              href="/tilbehoer"
              className={
                activeCategory === ""
                  ? "flex items-center rounded-lg py-1.5 pl-3 text-sm font-semibold text-green-eco border-l-2 border-green-eco bg-green-eco/5"
                  : "flex items-center rounded-lg py-1.5 pl-3 text-sm text-charcoal/65 hover:text-charcoal hover:bg-sand/40 transition-colors border-l-2 border-transparent"
              }
            >
              Alle
            </Link>
            {TILBEHOER_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/tilbehoer/${cat.slug}`}
                className={
                  activeCategory === cat.slug
                    ? "flex items-center rounded-lg py-1.5 pl-3 text-sm font-semibold text-green-eco border-l-2 border-green-eco bg-green-eco/5"
                    : "flex items-center rounded-lg py-1.5 pl-3 text-sm text-charcoal/65 hover:text-charcoal hover:bg-sand/40 transition-colors border-l-2 border-transparent"
                }
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* DEVICE MODEL SECTION (covers + skaermbeskyttelse only)              */}
        {/* ------------------------------------------------------------------ */}
        {isDeviceSpecific && (
          <>
            <Divider />
            <div>
              <button
                type="button"
                onClick={() => setDevicesCollapsed((v) => !v)}
                className="flex w-full items-center justify-between group"
              >
                <SectionHeading>Enhed</SectionHeading>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 text-charcoal/30 transition-transform duration-200 group-hover:text-charcoal/60 ${
                    devicesCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </button>

              {!devicesCollapsed && (
                <div className="mt-3 space-y-4">
                  {DEVICE_BRANDS.map(({ slug: brandSlug, label: brandLabel }) => {
                    const brandDevices = TILBEHOER_DEVICES.filter(
                      (d) => d.brand === brandSlug,
                    );
                    if (brandDevices.length === 0) return null;

                    const isExpanded = expandedBrands.has(brandSlug);
                    const visibleDevices = isExpanded
                      ? brandDevices
                      : brandDevices.slice(0, DEVICES_VISIBLE_DEFAULT);
                    const hasMore = brandDevices.length > DEVICES_VISIBLE_DEFAULT;

                    return (
                      <div key={brandSlug}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
                          {brandLabel}
                        </p>
                        <div className="space-y-0.5">
                          {visibleDevices.map((device) => {
                            const isActive = activeModel === device.label;
                            return (
                              <button
                                key={device.slug}
                                type="button"
                                onClick={() =>
                                  toggleLinkFilter("model", device.label)
                                }
                                className={`block w-full rounded-lg py-1.5 pl-3 text-left text-sm transition-colors border-l-2 ${
                                  isActive
                                    ? "border-green-eco bg-green-eco/5 font-semibold text-green-eco"
                                    : "border-transparent text-charcoal/60 hover:border-charcoal/20 hover:bg-sand/30 hover:text-charcoal"
                                }`}
                              >
                                {device.label}
                              </button>
                            );
                          })}
                        </div>

                        {hasMore && (
                          <button
                            type="button"
                            onClick={() => toggleExpandBrand(brandSlug)}
                            className="mt-1.5 flex items-center gap-1 pl-3 text-[12px] font-medium text-charcoal/40 hover:text-charcoal transition-colors"
                          >
                            {isExpanded ? "Vis færre" : `Vis alle ${brandDevices.length}`}
                            <ChevronDownIcon
                              className={`h-3 w-3 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* CONTEXT-AWARE FILTERS (case_type chips, protector_type, etc.)       */}
        {/* ------------------------------------------------------------------ */}
        {categoryFilters &&
          categoryFilters.filters.map((filter) => {
            if (filter.type === "links") {
              const currentValue = searchParams.get(filter.key) ?? "";

              // case_type uses pill/chip style
              if (filter.key === "case_type") {
                return (
                  <div key={filter.key}>
                    <Divider />
                    <div className="pt-5">
                      <SectionHeading>{filter.label}</SectionHeading>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {filter.options.map((option) => {
                          const isActive = currentValue === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                toggleLinkFilter(filter.key, option.value)
                              }
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${
                                isActive
                                  ? "border-green-eco/40 bg-green-eco/10 text-green-eco"
                                  : "border-sand bg-white text-charcoal/60 hover:border-charcoal/20 hover:bg-sand/30 hover:text-charcoal"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // Other link filters (protector_type, type for opladere, etc.)
              return (
                <div key={filter.key}>
                  <Divider />
                  <div className="pt-5">
                    <SectionHeading>{filter.label}</SectionHeading>
                    <div className="mt-3 space-y-0.5">
                      {filter.options.map((option) => {
                        const isActive = currentValue === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              toggleLinkFilter(filter.key, option.value)
                            }
                            className={`block w-full rounded-lg py-1.5 pl-3 text-left text-sm transition-colors border-l-2 ${
                              isActive
                                ? "border-green-eco bg-green-eco/5 font-semibold text-green-eco"
                                : "border-transparent text-charcoal/60 hover:border-charcoal/20 hover:bg-sand/30 hover:text-charcoal"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}

        {/* ------------------------------------------------------------------ */}
        {/* PRIS                                                                 */}
        {/* ------------------------------------------------------------------ */}
        <Divider />
        <div className="pt-0">
          <SectionHeading>Pris</SectionHeading>
          <div className="mt-3 space-y-2">
            {PRICE_RANGES.map((range) => {
              const checked = activePrices.includes(range.value);
              return (
                <label
                  key={range.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pl-1 text-sm text-charcoal/70 hover:text-charcoal transition-colors group"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? "border-green-eco bg-green-eco"
                        : "border-sand bg-white group-hover:border-charcoal/30"
                    }`}
                  >
                    {checked && (
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        className="h-3 w-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2 6l3 3 5-5"
                        />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePriceRange(range.value)}
                    className="sr-only"
                  />
                  {range.label}
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </aside>
  );
}
