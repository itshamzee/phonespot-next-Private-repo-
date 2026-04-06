"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  DEVICE_BRANDS,
  DEVICE_MODELS,
  getSeriesForBrand,
  getModelsForSeries,
} from "@/lib/spare-parts-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface QualityTier {
  id: string;
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
}

interface FilterModel {
  brand: string;
  series: string | null;
  model: string;
}

interface FilterSeriesEntry {
  brand: string;
  series: string[];
}

interface ActiveFilter {
  key: string;
  label: string;
  param: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Merge helpers — combine API data with static config as fallback
// ---------------------------------------------------------------------------

function getMergedBrands(apiBrands: string[]): string[] {
  const merged = new Set<string>([...apiBrands, ...DEVICE_BRANDS]);
  return [...merged].sort();
}

function getMergedSeries(
  brand: string,
  apiSeriesEntries: FilterSeriesEntry[],
): string[] {
  const apiEntry = apiSeriesEntries.find(
    (e) => e.brand.toLowerCase() === brand.toLowerCase(),
  );
  const apiSeries = apiEntry?.series ?? [];
  const configSeries = getSeriesForBrand(brand);
  const merged = new Set<string>([...apiSeries, ...configSeries]);
  return [...merged].sort();
}

function getMergedModels(
  brand: string,
  series: string,
  apiModels: FilterModel[],
): FilterModel[] {
  const apiFiltered = apiModels.filter(
    (m) =>
      m.brand.toLowerCase() === brand.toLowerCase() &&
      (m.series ?? "").toLowerCase() === series.toLowerCase(),
  );
  const apiModelNames = new Set(apiFiltered.map((m) => m.model));

  // Add models from config that aren't in the API result yet
  const configModels = getModelsForSeries(brand, series).map((cm) => ({
    brand: cm.brand,
    series: cm.series,
    model: cm.model,
    model_codes: cm.model_codes,
  }));

  const extras: FilterModel[] = configModels
    .filter((cm) => !apiModelNames.has(cm.model))
    .map((cm) => ({ brand: cm.brand, series: cm.series, model: cm.model }));

  return [...apiFiltered, ...extras].sort((a, b) =>
    a.model.localeCompare(b.model),
  );
}

function getModelCodesFromConfig(
  brand: string,
  series: string,
  model: string,
): string[] | undefined {
  const entry = DEVICE_MODELS.find(
    (m) =>
      m.brand.toLowerCase() === brand.toLowerCase() &&
      m.series.toLowerCase() === series.toLowerCase() &&
      m.model.toLowerCase() === model.toLowerCase(),
  );
  return entry?.model_codes;
}

// ---------------------------------------------------------------------------
// Helper — build label for active chips
// ---------------------------------------------------------------------------

function buildActiveFilters(
  params: URLSearchParams,
  categories: Category[],
  qualityTiers: QualityTier[],
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  const category = params.get("category");
  if (category) {
    const cat = categories.find((c) => c.slug === category);
    filters.push({
      key: "category",
      label: cat ? cat.name : category,
      param: "category",
      value: category,
    });
  }

  const brand = params.get("brand");
  if (brand) {
    filters.push({ key: "brand", label: brand, param: "brand", value: brand });
  }

  const series = params.get("series");
  if (series) {
    filters.push({
      key: "series",
      label: series,
      param: "series",
      value: series,
    });
  }

  const models = params.getAll("model");
  for (const m of models) {
    filters.push({ key: `model-${m}`, label: m, param: "model", value: m });
  }

  const qualities = params.getAll("quality");
  for (const q of qualities) {
    const tier = qualityTiers.find((t) => t.slug === q);
    filters.push({
      key: `quality-${q}`,
      label: tier ? tier.name : q,
      param: "quality",
      value: q,
    });
  }

  const minPrice = params.get("minPrice");
  const maxPrice = params.get("maxPrice");
  if (minPrice || maxPrice) {
    const label =
      minPrice && maxPrice
        ? `${Math.round(Number(minPrice) / 100)}–${Math.round(Number(maxPrice) / 100)} kr`
        : minPrice
          ? `Fra ${Math.round(Number(minPrice) / 100)} kr`
          : `Op til ${Math.round(Number(maxPrice) / 100)} kr`;
    filters.push({ key: "price", label, param: "price", value: "" });
  }

  return filters;
}

// ---------------------------------------------------------------------------
// FilterSection wrapper
// ---------------------------------------------------------------------------

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#E5E5EA] py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-[#111111]">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-3.5 w-3.5 shrink-0 text-[#86868B] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SparePartsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityTiers, setQualityTiers] = useState<QualityTier[]>([]);
  const [apiModels, setApiModels] = useState<FilterModel[]>([]);
  const [apiSeriesEntries, setApiSeriesEntries] = useState<FilterSeriesEntry[]>([]);
  const [apiBrands, setApiBrands] = useState<string[]>([]);

  // Local price state (committed on blur)
  const [minPriceInput, setMinPriceInput] = useState(
    searchParams.get("minPrice")
      ? String(Math.round(Number(searchParams.get("minPrice")) / 100))
      : "",
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    searchParams.get("maxPrice")
      ? String(Math.round(Number(searchParams.get("maxPrice")) / 100))
      : "",
  );

  const drawerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Fetch data on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      const [catRes, tierRes, filterRes] = await Promise.all([
        fetch("/api/admin/spare-parts/categories"),
        fetch("/api/admin/spare-parts/quality-tiers"),
        fetch("/api/spare-parts?filters=true"),
      ]);
      if (catRes.ok) setCategories((await catRes.json()) as Category[]);
      if (tierRes.ok) setQualityTiers((await tierRes.json()) as QualityTier[]);
      if (filterRes.ok) {
        const data = (await filterRes.json()) as {
          brands: string[];
          series: FilterSeriesEntry[];
          models: FilterModel[];
          colors: string[];
        };
        setApiBrands(data.brands ?? []);
        setApiSeriesEntries(data.series ?? []);
        setApiModels(data.models ?? []);
      }
    }
    void load();
  }, []);

  // Close drawer on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    }
    if (drawerOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [drawerOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // ---------------------------------------------------------------------------
  // URL helpers
  // ---------------------------------------------------------------------------

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const toggleMultiParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      const existing = params.getAll(key);
      params.delete(key);
      if (existing.includes(value)) {
        for (const v of existing.filter((x) => x !== value)) params.append(key, v);
      } else {
        for (const v of existing) params.append(key, v);
        params.append(key, value);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const removeFilter = useCallback(
    (filter: ActiveFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (filter.param === "model" || filter.param === "quality") {
        const existing = params.getAll(filter.param);
        params.delete(filter.param);
        for (const v of existing.filter((x) => x !== filter.value)) {
          params.append(filter.param, v);
        }
      } else if (filter.param === "price") {
        params.delete("minPrice");
        params.delete("maxPrice");
        setMinPriceInput("");
        setMaxPriceInput("");
      } else if (filter.param === "series") {
        // Clearing series also clears dependent model selection
        params.delete("series");
        params.delete("model");
      } else if (filter.param === "brand") {
        // Clearing brand also clears series and model
        params.delete("brand");
        params.delete("series");
        params.delete("model");
      } else {
        params.delete(filter.param);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const resetAll = useCallback(() => {
    setMinPriceInput("");
    setMaxPriceInput("");
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const commitPrice = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const min = minPriceInput.trim();
    const max = maxPriceInput.trim();
    if (min) {
      params.set("minPrice", String(Number(min) * 100));
    } else {
      params.delete("minPrice");
    }
    if (max) {
      params.set("maxPrice", String(Number(max) * 100));
    } else {
      params.delete("maxPrice");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, minPriceInput, maxPriceInput]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const selectedCategory = searchParams.get("category") ?? "";
  const selectedBrand = searchParams.get("brand") ?? "";
  const selectedSeries = searchParams.get("series") ?? "";
  const selectedModels = searchParams.getAll("model");
  const selectedQualities = searchParams.getAll("quality");

  // Merged brand list (API + config)
  const allBrands = getMergedBrands(apiBrands);

  // Series list for currently selected brand (API + config merged)
  const seriesForBrand = selectedBrand
    ? getMergedSeries(selectedBrand, apiSeriesEntries)
    : [];

  // Models for brand + series combo (API + config merged)
  const modelsForSeries =
    selectedBrand && selectedSeries
      ? getMergedModels(selectedBrand, selectedSeries, apiModels)
      : [];

  const activeFilters = buildActiveFilters(searchParams, categories, qualityTiers);
  const hasActiveFilters = activeFilters.length > 0;

  // ---------------------------------------------------------------------------
  // Brand change handler — clears series + model
  // ---------------------------------------------------------------------------

  const handleBrandChange = useCallback(
    (brand: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("series");
      params.delete("model");
      if (brand) {
        params.set("brand", brand);
      } else {
        params.delete("brand");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ---------------------------------------------------------------------------
  // Series change handler — clears model
  // ---------------------------------------------------------------------------

  const handleSeriesChange = useCallback(
    (series: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("model");
      if (series) {
        params.set("series", series);
      } else {
        params.delete("series");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ---------------------------------------------------------------------------
  // Filter panel content
  // ---------------------------------------------------------------------------

  const filterContent = (
    <div className="flex flex-col">
      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => removeFilter(f)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-white px-3 py-1 text-xs font-medium text-[#111111] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
            >
              {f.label}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#86868B] underline-offset-2 hover:text-[#111111] hover:underline"
          >
            Nulstil alle
          </button>
        </div>
      )}

      {/* Deltype — prominent pills for common categories, dropdown for rest */}
      <FilterSection title="Deltype">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => updateParam("category", selectedCategory ? null : null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !selectedCategory
                ? "bg-[#1A3D2E] text-white"
                : "border border-[#E5E5EA] bg-white text-[#111111] hover:border-[#1A3D2E]"
            }`}
          >
            Alle
          </button>
          {categories
            .filter((c) => [
              "skaerme", "batterier", "kameralinser", "kameraer",
              "opladningsstik", "hojttalere", "bagcovers",
            ].includes(c.slug))
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateParam("category", selectedCategory === cat.slug ? null : cat.slug)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat.slug
                    ? "bg-[#1A3D2E] text-white"
                    : "border border-[#E5E5EA] bg-white text-[#111111] hover:border-[#1A3D2E]"
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>
        {categories.filter((c) => ![
          "skaerme", "batterier", "kameralinser", "kameraer",
          "opladningsstik", "hojttalere", "bagcovers",
        ].includes(c.slug)).length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => updateParam("category", e.target.value || null)}
            className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
          >
            <option value="">Flere kategorier...</option>
            {categories
              .filter((c) => ![
                "skaerme", "batterier", "kameralinser", "kameraer",
                "opladningsstik", "hojttalere", "bagcovers",
              ].includes(c.slug))
              .map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
          </select>
        )}
      </FilterSection>

      {/* Level 1: Enhedsmærke */}
      <FilterSection title="Enhedsmærke">
        <select
          value={selectedBrand}
          onChange={(e) => handleBrandChange(e.target.value)}
          className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
        >
          <option value="">Alle mærker</option>
          {allBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Level 2: Enhedstype — only shown when a brand is selected */}
      {selectedBrand && seriesForBrand.length > 0 && (
        <FilterSection title="Enhedstype" defaultOpen={true}>
          <select
            value={selectedSeries}
            onChange={(e) => handleSeriesChange(e.target.value)}
            className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
          >
            <option value="">Alle typer</option>
            {seriesForBrand.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FilterSection>
      )}

      {/* Level 3: Model — only shown when a series is selected */}
      {selectedBrand && selectedSeries && modelsForSeries.length > 0 && (
        <FilterSection title="Model" defaultOpen={selectedModels.length > 0}>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {modelsForSeries.map((m) => {
              const checked = selectedModels.includes(m.model);
              const codes = getModelCodesFromConfig(
                m.brand,
                selectedSeries,
                m.model,
              );
              return (
                <label
                  key={`${m.brand}-${m.series ?? ""}-${m.model}`}
                  className="flex cursor-pointer items-start gap-2.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMultiParam("model", m.model)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E5E5EA] accent-[#1A3D2E]"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm text-[#111111]">{m.model}</span>
                    {codes && codes.length > 0 && (
                      <span className="text-xs text-[#86868B]">
                        {codes.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Kvalitet */}
      {qualityTiers.length > 0 && (
        <FilterSection title="Kvalitet">
          <div className="space-y-2">
            {qualityTiers.map((tier) => {
              const checked = selectedQualities.includes(tier.slug);
              return (
                <label key={tier.id} className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMultiParam("quality", tier.slug)}
                    className="h-4 w-4 rounded border-[#E5E5EA] accent-[#1A3D2E]"
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tier.badge_color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-[#111111]">{tier.name}</span>
                </label>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Pris */}
      <FilterSection title="Pris (DKK)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Fra"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
            }}
            className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
          />
          <span className="shrink-0 text-xs text-[#86868B]">&ndash;</span>
          <input
            type="number"
            min={0}
            placeholder="Til"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
            }}
            className="w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
          />
        </div>
      </FilterSection>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Mobile: "Filtre" trigger button */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] transition-colors hover:border-[#1A3D2E]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
            />
          </svg>
          Filtre
          {hasActiveFilters && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1A3D2E] px-1.5 text-[10px] font-semibold text-white">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtre"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={drawerRef}
            className="absolute inset-y-0 left-0 flex w-[min(320px,90vw)] flex-col bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
              <span className="font-semibold text-[#111111]">Filtre</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-[#86868B] transition-colors hover:bg-[#F7F7F8] hover:text-[#111111]"
                aria-label="Luk filtre"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">{filterContent}</div>

            {/* Footer */}
            <div className="border-t border-[#E5E5EA] px-5 py-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-lg bg-[#1A3D2E] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1A3D2E]/90"
              >
                Vis resultater
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-6">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
            <span className="font-semibold text-[#111111]">Filtre</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-medium text-[#86868B] hover:text-[#1A3D2E]"
              >
                Nulstil
              </button>
            )}
          </div>
          <div className="pt-1">{filterContent}</div>
        </div>
      </aside>
    </>
  );
}
