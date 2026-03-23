"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  TILBEHOER_CATEGORIES,
  TILBEHOER_DEVICES,
  DEVICE_BRANDS,
  type DeviceBrand,
} from "@/lib/tilbehoer-config";
import { getCategoryFilters, PRICE_RANGES } from "@/lib/tilbehoer-filter-config";

interface TilbehoerMobileFiltersProps {
  open: boolean;
  onClose: () => void;
  activeCategory: string;
  productCount: number;
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4.5 4.5L16 6" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface AccordionSectionProps {
  heading: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({ heading, children, defaultOpen = false }: AccordionSectionProps) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div className="border-b border-sand/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-3.5 text-left"
        aria-expanded={expanded}
      >
        <span className="font-display text-sm font-bold text-charcoal">{heading}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-charcoal/60 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && <div className="pb-4">{children}</div>}
    </div>
  );
}

const DEVICES_VISIBLE_DEFAULT = 5;

export function TilbehoerMobileFilters({
  open,
  onClose,
  activeCategory,
  productCount,
}: TilbehoerMobileFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePrices = searchParams.get("pris")?.split(",").filter(Boolean) ?? [];
  const activeModel = searchParams.get("model") ?? "";
  const activeType = searchParams.get("type") ?? "";
  const activeCaseType = searchParams.get("case_type") ?? "";
  const activeProtectorType = searchParams.get("protector_type") ?? "";

  const [expandedBrands, setExpandedBrands] = useState<Set<DeviceBrand>>(new Set());

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("side");

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const togglePrice = (value: string) => {
    const next = activePrices.includes(value)
      ? activePrices.filter((v) => v !== value)
      : [...activePrices, value];
    updateParam({ pris: next.length > 0 ? next.join(",") : null });
  };

  const handleCategoryPill = (slug: string) => {
    if (slug === "alle") {
      router.push("/tilbehoer");
    } else {
      router.push(`/tilbehoer/${slug}`);
    }
    onClose();
  };

  const handleFilterClick = (key: string, value: string) => {
    const currentValues: Record<string, string> = {
      model: activeModel,
      type: activeType,
      case_type: activeCaseType,
      protector_type: activeProtectorType,
    };
    const current = currentValues[key] ?? "";
    updateParam({ [key]: current === value ? null : value });
  };

  const toggleExpandBrand = (brand: DeviceBrand) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  };

  const categoryFiltersConfig = getCategoryFilters(activeCategory);
  const isDeviceSpecific =
    activeCategory === "covers" || activeCategory === "skaermbeskyttelse";

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter"
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl"
      >
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-sand/60">
              <h2 className="font-display text-lg font-bold text-charcoal">Filter</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal/60 hover:bg-sand/40 hover:text-charcoal transition-colors"
                aria-label="Luk filter"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Category pills */}
            <div className="py-4 border-b border-sand/60">
              <p className="mb-2.5 font-display text-sm font-bold text-charcoal">Kategori</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => handleCategoryPill("alle")}
                  className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                    activeCategory === ""
                      ? "bg-green-eco text-white"
                      : "border border-sand bg-white text-charcoal"
                  }`}
                >
                  Alle
                </button>
                {TILBEHOER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => handleCategoryPill(cat.slug)}
                    className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                      activeCategory === cat.slug
                        ? "bg-green-eco text-white"
                        : "border border-sand bg-white text-charcoal"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Device model section — only for covers & skaermbeskyttelse */}
            {isDeviceSpecific && (
              <AccordionSection heading="Enhed" defaultOpen={!!activeModel}>
                <div className="space-y-4">
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
                        <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
                          {brandLabel}
                        </p>
                        <ul className="space-y-0.5">
                          {visibleDevices.map((device) => {
                            const isActive = activeModel === device.label;
                            return (
                              <li key={device.slug}>
                                <button
                                  type="button"
                                  onClick={() => handleFilterClick("model", device.label)}
                                  className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-sm transition-colors hover:bg-sand/30 ${
                                    isActive
                                      ? "font-medium text-green-eco"
                                      : "text-charcoal/70"
                                  }`}
                                >
                                  <span>{device.label}</span>
                                  {isActive && (
                                    <CheckIcon className="h-4 w-4 shrink-0 text-green-eco" />
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        {hasMore && (
                          <button
                            type="button"
                            onClick={() => toggleExpandBrand(brandSlug)}
                            className="mt-1 flex items-center gap-1 px-2 text-xs font-medium text-charcoal/40 hover:text-charcoal transition-colors"
                          >
                            {isExpanded
                              ? "Vis færre"
                              : `Vis alle ${brandDevices.length}`}
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
              </AccordionSection>
            )}

            {/* Context-aware category filters */}
            {categoryFiltersConfig && (
              <div className="space-y-0">
                {categoryFiltersConfig.filters.map((filter) => {
                  const currentValue =
                    filter.key === "case_type"
                      ? activeCaseType
                      : filter.key === "protector_type"
                      ? activeProtectorType
                      : activeType;

                  // case_type: pill chips
                  if (filter.key === "case_type") {
                    return (
                      <AccordionSection key={filter.key} heading={filter.label} defaultOpen>
                        <div className="flex flex-wrap gap-2 px-2">
                          {filter.options.map((option) => {
                            const isActive = currentValue === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  handleFilterClick(filter.key, option.value)
                                }
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                                  isActive
                                    ? "border-green-eco/40 bg-green-eco/10 text-green-eco"
                                    : "border-sand bg-white text-charcoal/70"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </AccordionSection>
                    );
                  }

                  // Standard links filter
                  return (
                    <AccordionSection key={filter.key} heading={filter.label} defaultOpen>
                      <ul className="space-y-0.5">
                        {filter.options.map((option) => {
                          const isActive = currentValue === option.value;
                          return (
                            <li key={option.value}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleFilterClick(filter.key, option.value)
                                }
                                className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-sm transition-colors hover:bg-sand/30 ${
                                  isActive
                                    ? "font-medium text-green-eco"
                                    : "text-charcoal/70"
                                }`}
                              >
                                <span>{option.label}</span>
                                {isActive && (
                                  <CheckIcon className="h-4 w-4 shrink-0 text-green-eco" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionSection>
                  );
                })}
              </div>
            )}

            {/* Price section */}
            <AccordionSection heading="Pris" defaultOpen>
              <ul className="space-y-0.5">
                {PRICE_RANGES.map((range) => {
                  const isActive = activePrices.includes(range.value);
                  return (
                    <li key={range.value}>
                      <button
                        type="button"
                        onClick={() => togglePrice(range.value)}
                        className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-sm transition-colors hover:bg-sand/30 ${
                          isActive ? "font-medium text-green-eco" : "text-charcoal/70"
                        }`}
                      >
                        <span>{range.label}</span>
                        {isActive && (
                          <CheckIcon className="h-4 w-4 shrink-0 text-green-eco" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </AccordionSection>
          </div>
        </div>

        {/* Sticky bottom button */}
        <div className="sticky bottom-0 border-t border-sand bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-green-eco py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-eco/90 active:bg-green-eco/80"
          >
            Vis {productCount} produkter
          </button>
        </div>
      </div>
    </>
  );
}
