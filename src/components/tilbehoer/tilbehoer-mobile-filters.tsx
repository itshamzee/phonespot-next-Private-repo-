"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TILBEHOER_CATEGORIES, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
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
  const activeInStore = searchParams.get("butik") === "1";
  const activeBrand = searchParams.get("brand") ?? "";
  const activeModel = searchParams.get("model") ?? "";
  const activeType = searchParams.get("type") ?? "";

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

  const handleLinkFilterClick = (key: string, value: string) => {
    const currentValue = key === "brand" ? activeBrand : key === "model" ? activeModel : activeType;
    if (currentValue === value) {
      // deselect
      if (key === "brand") {
        updateParam({ brand: null, model: null });
      } else {
        updateParam({ [key]: null });
      }
    } else {
      if (key === "brand") {
        // switching brand clears model
        updateParam({ brand: value, model: null });
      } else {
        updateParam({ [key]: value });
      }
    }
  };

  const categoryFiltersConfig = getCategoryFilters(activeCategory);

  // Devices filtered by currently selected brand for the model sub-filter
  const filteredDevices =
    activeBrand
      ? TILBEHOER_DEVICES.filter((d) => d.brand === activeBrand)
      : [];

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
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[75vh] flex-col rounded-t-2xl bg-white shadow-2xl"
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
                {/* "Alle" pill */}
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

            {/* Context-aware filters */}
            {categoryFiltersConfig && (
              <div className="space-y-0">
                {categoryFiltersConfig.filters.map((filter) => {
                  // Model filter with dependsOn "brand" — only shown when brand is active
                  if (filter.key === "model" && filter.dependsOn === "brand") {
                    if (!activeBrand) return null;

                    const currentValue = activeModel;

                    return (
                      <AccordionSection key={filter.key} heading={filter.label} defaultOpen>
                        <ul className="space-y-0.5">
                          {filteredDevices.map((device) => {
                            const isActive = currentValue === device.slug;
                            return (
                              <li key={device.slug}>
                                <button
                                  type="button"
                                  onClick={() => handleLinkFilterClick("model", device.slug)}
                                  className={`flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-sm transition-colors hover:bg-sand/30 ${
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
                      </AccordionSection>
                    );
                  }

                  // Regular filter (brand, type, etc.)
                  const currentValue =
                    filter.key === "brand" ? activeBrand : activeType;

                  return (
                    <AccordionSection
                      key={filter.key}
                      heading={filter.label}
                      defaultOpen
                    >
                      <ul className="space-y-0.5">
                        {filter.options.map((option) => {
                          const isActive = currentValue === option.value;
                          return (
                            <li key={option.value}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleLinkFilterClick(filter.key, option.value)
                                }
                                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-sm transition-colors hover:bg-sand/30 ${
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
                        className={`flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-sm transition-colors hover:bg-sand/30 ${
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

            {/* Kun i butik toggle */}
            <AccordionSection heading="Tilgjengelighed">
              <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg px-2 text-sm text-charcoal/70 hover:bg-sand/30 transition-colors">
                <span className={activeInStore ? "font-medium text-green-eco" : ""}>
                  Kun i butik
                </span>
                <input
                  type="checkbox"
                  checked={activeInStore}
                  onChange={(e) =>
                    updateParam({ butik: e.target.checked ? "1" : null })
                  }
                  className="h-5 w-5 rounded border-sand text-green-eco focus:ring-green-eco"
                />
              </label>
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
