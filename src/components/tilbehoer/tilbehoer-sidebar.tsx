"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { TILBEHOER_CATEGORIES, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { getCategoryFilters, PRICE_RANGES } from "@/lib/tilbehoer-filter-config";

interface TilbehoerSidebarProps {
  activeCategory: string; // "" for hub/all, or "covers", "opladere", etc.
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-[13px] font-bold uppercase tracking-wider text-charcoal/40">
      {children}
    </h3>
  );
}

export function TilbehoerSidebar({ activeCategory }: TilbehoerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePrices = searchParams.get("pris")?.split(",").filter(Boolean) ?? [];
  const activeBrand = searchParams.get("brand") ?? "";
  const activeModel = searchParams.get("model") ?? "";
  const inStore = searchParams.get("inStore") === "true";

  // Build a new URLSearchParams based on current, apply updates, return query string
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
      // Reset page on filter change
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

  // Toggle a single-value link filter (e.g. brand, type)
  function toggleLinkFilter(key: string, value: string, clearKeys?: string[]) {
    const currentValue = searchParams.get(key) ?? "";
    const isActive = currentValue === value;
    const updates: Record<string, string | null> = {
      [key]: isActive ? null : value,
    };
    if (clearKeys) {
      for (const k of clearKeys) {
        updates[k] = null;
      }
    }
    navigate(updates);
  }

  // Toggle a checkbox (price ranges — multi-value comma-separated)
  function togglePriceRange(value: string) {
    const next = activePrices.includes(value)
      ? activePrices.filter((v) => v !== value)
      : [...activePrices, value];
    navigate({ pris: next.length > 0 ? next.join(",") : null });
  }

  function toggleInStore() {
    navigate({ inStore: inStore ? null : "true" });
  }

  const categoryFilters = activeCategory ? getCategoryFilters(activeCategory) : null;

  // Devices filtered by the currently selected brand (for dependent model filter)
  const devicesForBrand = activeBrand
    ? TILBEHOER_DEVICES.filter((d) => d.brand === activeBrand)
    : [];

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto space-y-6 pb-6">

        {/* ------------------------------------------------------------------ */}
        {/* 1. KATEGORIER                                                        */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <SectionHeading>Kategorier</SectionHeading>
          <nav className="mt-3 space-y-1">
            <Link
              href="/tilbehoer"
              className={
                activeCategory === ""
                  ? "block text-sm font-semibold text-green-eco border-l-2 border-green-eco pl-3"
                  : "block text-sm text-charcoal/70 hover:text-charcoal pl-3 transition-colors"
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
                    ? "block text-sm font-semibold text-green-eco border-l-2 border-green-eco pl-3"
                    : "block text-sm text-charcoal/70 hover:text-charcoal pl-3 transition-colors"
                }
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 2. CONTEXT-AWARE FILTERS                                             */}
        {/* ------------------------------------------------------------------ */}
        {categoryFilters && categoryFilters.filters.map((filter, index) => {
          // Model filter with dependsOn "brand": only show when brand is selected
          if (filter.key === "model" && filter.dependsOn === "brand") {
            if (!activeBrand || devicesForBrand.length === 0) return null;

            return (
              <div key={filter.key} className="border-t border-sand pt-4">
                <SectionHeading>{filter.label}</SectionHeading>
                <div className="mt-3 space-y-1">
                  {devicesForBrand.map((device) => {
                    const isActive = activeModel === device.label;
                    return (
                      <button
                        key={device.slug}
                        type="button"
                        onClick={() => toggleLinkFilter("model", device.label)}
                        className={
                          isActive
                            ? "block w-full text-left text-sm text-charcoal font-medium pl-3 transition-colors"
                            : "block w-full text-left text-sm text-charcoal/60 hover:text-charcoal pl-3 transition-colors"
                        }
                      >
                        {device.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Standard "links" filter
          if (filter.type === "links") {
            const currentValue = searchParams.get(filter.key) ?? "";
            const dividerClass = index > 0 ? "border-t border-sand pt-4" : "";

            return (
              <div key={filter.key} className={dividerClass}>
                <SectionHeading>{filter.label}</SectionHeading>
                <div className="mt-3 space-y-1">
                  {filter.options.map((option) => {
                    const isActive = currentValue === option.value;
                    // When toggling brand, also clear model
                    const clearKeys = filter.key === "brand" ? ["model"] : undefined;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleLinkFilter(filter.key, option.value, clearKeys)}
                        className={
                          isActive
                            ? "block w-full text-left text-sm text-charcoal font-medium pl-3 transition-colors"
                            : "block w-full text-left text-sm text-charcoal/60 hover:text-charcoal pl-3 transition-colors"
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* ------------------------------------------------------------------ */}
        {/* 3. PRIS (always shown)                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="border-t border-sand pt-4">
          <SectionHeading>Pris</SectionHeading>
          <div className="mt-3 space-y-2">
            {PRICE_RANGES.map((range) => (
              <label
                key={range.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80 hover:text-charcoal transition-colors"
              >
                <input
                  type="checkbox"
                  checked={activePrices.includes(range.value)}
                  onChange={() => togglePriceRange(range.value)}
                  className="h-4 w-4 rounded border-sand text-green-eco focus:ring-green-eco"
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 4. KUN I BUTIK toggle (always shown)                                 */}
        {/* ------------------------------------------------------------------ */}
        <div className="border-t border-sand pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80 hover:text-charcoal transition-colors">
            <input
              type="checkbox"
              checked={inStore}
              onChange={toggleInStore}
              className="h-4 w-4 rounded border-sand text-green-eco focus:ring-green-eco"
            />
            Kun i butik
          </label>
        </div>

      </div>
    </aside>
  );
}
