"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ProductTemplate } from "@/lib/supabase/platform-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateWithStock extends ProductTemplate {
  device_count: number;
  min_price: number | null;
  locations: { name: string; type: string; count: number }[];
}

type SortOption = "price_asc" | "price_desc" | "popular" | "newest";

interface FilterState {
  priceMin: string;
  priceMax: string;
  grades: Set<"A" | "B" | "C">;
  storageOptions: Set<string>;
  onlyInStock: boolean;
  onlyPickup: boolean;
  sort: SortOption;
}

interface CategoryFiltersProps {
  templates: TemplateWithStock[];
  onFilter: (filtered: TemplateWithStock[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All prices from the DB are in øre (DKK cents). Convert to kroner for UI. */
function oreToKr(ore: number): number {
  return Math.round(ore / 100);
}

/** Parse a user-entered DKK amount to øre, returning null when empty/invalid. */
function krToOre(kr: string): number | null {
  const n = parseInt(kr.replace(/\D/g, ""), 10);
  return isNaN(n) ? null : n * 100;
}

const SORT_LABELS: Record<SortOption, string> = {
  price_asc: "Pris (lav-høj)",
  price_desc: "Pris (høj-lav)",
  popular: "Populære først",
  newest: "Nyeste",
};

const PRICE_QUICK_BUTTONS: { label: string; min: string; max: string }[] = [
  { label: "Under 2.000", min: "", max: "2000" },
  { label: "2.000–4.000", min: "2000", max: "4000" },
  { label: "4.000–6.000", min: "4000", max: "6000" },
  { label: "Over 6.000", min: "6000", max: "" },
];

const GRADE_OPTIONS: { grade: "A" | "B" | "C"; label: string; desc: string }[] = [
  { grade: "A", label: "Grade A", desc: "Som ny" },
  { grade: "B", label: "Grade B", desc: "God stand" },
  { grade: "C", label: "Grade C", desc: "Brugt" },
];

/** Normalise a storage string so "128 GB" and "128GB" are treated the same. */
function normaliseStorage(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

/** Sort the normalised storage strings by their numeric value. */
function sortStorageOptions(options: string[]): string[] {
  return [...options].sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
}

function buildDefaultState(): FilterState {
  return {
    priceMin: "",
    priceMax: "",
    grades: new Set(),
    storageOptions: new Set(),
    onlyInStock: false,
    onlyPickup: false,
    sort: "price_asc",
  };
}

function countActiveFilters(state: FilterState): number {
  let count = 0;
  if (state.priceMin || state.priceMax) count++;
  count += state.grades.size;
  count += state.storageOptions.size;
  if (state.onlyInStock) count++;
  if (state.onlyPickup) count++;
  return count;
}

// ---------------------------------------------------------------------------
// Filter + sort logic
// ---------------------------------------------------------------------------

function applyFilters(
  templates: TemplateWithStock[],
  state: FilterState
): TemplateWithStock[] {
  const minOre = krToOre(state.priceMin);
  const maxOre = krToOre(state.priceMax);

  let results = templates.filter((t) => {
    // Price
    if (minOre !== null && (t.min_price === null || t.min_price < minOre)) return false;
    if (maxOre !== null && (t.min_price === null || t.min_price > maxOre)) return false;

    // Grade — a template matches if at least one selected grade has a price set
    if (state.grades.size > 0) {
      const hasGrade =
        (state.grades.has("A") && t.base_price_a !== null) ||
        (state.grades.has("B") && t.base_price_b !== null) ||
        (state.grades.has("C") && t.base_price_c !== null);
      if (!hasGrade) return false;
    }

    // Storage
    if (state.storageOptions.size > 0) {
      const templateStorage = (t.storage_options ?? []).map(normaliseStorage);
      const hasStorage = [...state.storageOptions].some((s) =>
        templateStorage.includes(normaliseStorage(s))
      );
      if (!hasStorage) return false;
    }

    // In stock
    if (state.onlyInStock && t.device_count === 0) return false;

    // Pickup
    if (state.onlyPickup) {
      const hasStore = t.locations.some((l) => l.type === "store");
      if (!hasStore) return false;
    }

    return true;
  });

  // Sort
  switch (state.sort) {
    case "price_asc":
      results = results.sort(
        (a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity)
      );
      break;
    case "price_desc":
      results = results.sort(
        (a, b) => (b.min_price ?? -Infinity) - (a.min_price ?? -Infinity)
      );
      break;
    case "popular":
      results = results.sort((a, b) => b.device_count - a.device_count);
      break;
    case "newest":
      results = results.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#111111]"
      aria-expanded={open}
    >
      <span>{label}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-4 w-4 shrink-0 text-[#6E6E73] transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CategoryFilters({ templates, onFilter }: CategoryFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(buildDefaultState);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Which sections are collapsed
  const [openSections, setOpenSections] = useState({
    price: true,
    grade: true,
    storage: true,
    availability: true,
    sort: true,
  });

  // Derive available storage options from the full template list (memoised by
  // reference equality — templates doesn't change after initial server fetch).
  const allStorageOptions = useRef<string[]>([]);
  useEffect(() => {
    const seen = new Set<string>();
    for (const t of templates) {
      for (const s of t.storage_options ?? []) {
        seen.add(normaliseStorage(s));
      }
    }
    allStorageOptions.current = sortStorageOptions([...seen]);
  }, [templates]);

  // Run filter + notify parent on every state change
  useEffect(() => {
    onFilter(applyFilters(templates, filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ---- Setters ----

  const resetFilters = useCallback(() => setFilters(buildDefaultState()), []);

  const toggleSection = (section: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const setGrade = (grade: "A" | "B" | "C", checked: boolean) =>
    setFilters((prev) => {
      const next = new Set(prev.grades);
      checked ? next.add(grade) : next.delete(grade);
      return { ...prev, grades: next };
    });

  const setStorage = (s: string, checked: boolean) =>
    setFilters((prev) => {
      const next = new Set(prev.storageOptions);
      checked ? next.add(normaliseStorage(s)) : next.delete(normaliseStorage(s));
      return { ...prev, storageOptions: next };
    });

  const applyQuickPrice = (min: string, max: string) =>
    setFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }));

  const activeCount = countActiveFilters(filters);
  const storageOpts = allStorageOptions.current;

  // ---- Sidebar panel (shared between desktop sidebar & mobile drawer) ----

  const panelContent = (
    <div className="flex flex-col gap-0">

      {/* Sort */}
      <div className="border-b border-[#E5E5EA]">
        <FilterSectionHeader
          label="Sortering"
          open={openSections.sort}
          onToggle={() => toggleSection("sort")}
        />
        {openSections.sort && (
          <div className="pb-4">
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, sort: e.target.value as SortOption }))
              }
              className="w-full rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] px-3 py-2.5 text-sm text-[#111111] focus:border-[#1A3D2E] focus:outline-none focus:ring-1 focus:ring-[#1A3D2E]"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Price range */}
      <div className="border-b border-[#E5E5EA]">
        <FilterSectionHeader
          label="Pris (DKK)"
          open={openSections.price}
          onToggle={() => toggleSection("price")}
        />
        {openSections.price && (
          <div className="pb-4 space-y-3">
            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5">
              {PRICE_QUICK_BUTTONS.map((btn) => {
                const isActive =
                  filters.priceMin === btn.min && filters.priceMax === btn.max;
                return (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() =>
                      isActive
                        ? applyQuickPrice("", "")
                        : applyQuickPrice(btn.min, btn.max)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[#1A3D2E] bg-[#1A3D2E] text-white"
                        : "border-[#E5E5EA] bg-white text-[#111111] hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Custom min/max inputs */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Fra"
                  value={filters.priceMin}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      priceMin: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="w-full rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] px-3 py-2 pr-10 text-sm text-[#111111] placeholder-[#6E6E73] focus:border-[#1A3D2E] focus:outline-none focus:ring-1 focus:ring-[#1A3D2E]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6E6E73]">
                  kr
                </span>
              </div>
              <span className="shrink-0 text-xs text-[#6E6E73]">—</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Til"
                  value={filters.priceMax}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      priceMax: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="w-full rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] px-3 py-2 pr-10 text-sm text-[#111111] placeholder-[#6E6E73] focus:border-[#1A3D2E] focus:outline-none focus:ring-1 focus:ring-[#1A3D2E]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6E6E73]">
                  kr
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grade / Stand */}
      <div className="border-b border-[#E5E5EA]">
        <FilterSectionHeader
          label="Stand"
          open={openSections.grade}
          onToggle={() => toggleSection("grade")}
        />
        {openSections.grade && (
          <div className="pb-4 space-y-2">
            {GRADE_OPTIONS.map(({ grade, label, desc }) => {
              // Determine whether this grade is available across any template
              const available = templates.some((t) => {
                if (grade === "A") return t.base_price_a !== null;
                if (grade === "B") return t.base_price_b !== null;
                return t.base_price_c !== null;
              });

              return (
                <label
                  key={grade}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    filters.grades.has(grade)
                      ? "bg-[#1A3D2E]/8"
                      : "hover:bg-[#F7F7F8]"
                  } ${!available ? "opacity-40" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={filters.grades.has(grade)}
                    disabled={!available}
                    onChange={(e) => setGrade(grade, e.target.checked)}
                    className="h-4 w-4 rounded border-[#E5E5EA] accent-[#1A3D2E]"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[#111111]">
                      {label}
                    </span>
                    <span className="block text-xs text-[#6E6E73]">{desc}</span>
                  </span>
                  {!available && (
                    <span className="text-[10px] font-medium text-[#6E6E73]">
                      Ikke på lager
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Storage */}
      {storageOpts.length > 0 && (
        <div className="border-b border-[#E5E5EA]">
          <FilterSectionHeader
            label="Lagerkapacitet"
            open={openSections.storage}
            onToggle={() => toggleSection("storage")}
          />
          {openSections.storage && (
            <div className="pb-4">
              <div className="flex flex-wrap gap-1.5">
                {storageOpts.map((s) => {
                  const isActive = filters.storageOptions.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStorage(s, !isActive)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-[#1A3D2E] bg-[#1A3D2E] text-white"
                          : "border-[#E5E5EA] bg-white text-[#111111] hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Availability */}
      <div className="border-b border-[#E5E5EA]">
        <FilterSectionHeader
          label="Tilgængelighed"
          open={openSections.availability}
          onToggle={() => toggleSection("availability")}
        />
        {openSections.availability && (
          <div className="pb-4 space-y-2">
            {/* In stock toggle */}
            <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors ${filters.onlyInStock ? "bg-[#1A3D2E]/8" : "hover:bg-[#F7F7F8]"}`}>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[#111111]">
                  Kun pa lager
                </span>
                <span className="block text-xs text-[#6E6E73]">
                  Skjul udsolgte modeller
                </span>
              </span>
              {/* Toggle switch */}
              <div className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  checked={filters.onlyInStock}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, onlyInStock: e.target.checked }))
                  }
                  className="peer sr-only"
                  id="toggle-instock"
                />
                <div className="h-5 w-9 rounded-full border border-[#E5E5EA] bg-[#E5E5EA] transition-colors peer-checked:border-[#1A3D2E] peer-checked:bg-[#1A3D2E]" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
            </label>

            {/* Pickup toggle */}
            <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors ${filters.onlyPickup ? "bg-[#1A3D2E]/8" : "hover:bg-[#F7F7F8]"}`}>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[#111111]">
                  Kan hentes i butik
                </span>
                <span className="block text-xs text-[#6E6E73]">
                  Vis kun modeller med butikslagre
                </span>
              </span>
              <div className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  checked={filters.onlyPickup}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, onlyPickup: e.target.checked }))
                  }
                  className="peer sr-only"
                  id="toggle-pickup"
                />
                <div className="h-5 w-9 rounded-full border border-[#E5E5EA] bg-[#E5E5EA] transition-colors peer-checked:border-[#1A3D2E] peer-checked:bg-[#1A3D2E]" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Reset button */}
      {activeCount > 0 && (
        <div className="pt-4">
          <button
            type="button"
            onClick={resetFilters}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:border-[#111111]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                clipRule="evenodd"
              />
            </svg>
            Ryd filtre
          </button>
        </div>
      )}
    </div>
  );

  // ---- Render ----

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Mobile: sticky "Filtre" button + slide-in drawer                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#111111] shadow-sm transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
          aria-label="Abn filterside panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM4.25 17a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM17.25 17a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM9 10a.75.75 0 0 1-.75.75h-6.5a.75.75 0 0 1 0-1.5h6.5A.75.75 0 0 1 9 10ZM17.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM10 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" />
          </svg>
          Filtre
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A3D2E] text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* Backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtre"
          className={`fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ${
            drawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[#E5E5EA]" aria-hidden="true" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
            <h2 className="text-base font-bold text-[#111111]">
              Filtre
              {activeCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A3D2E] text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full p-1.5 text-[#6E6E73] transition-colors hover:bg-[#F7F7F8] hover:text-[#111111]"
              aria-label="Luk filtre"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* Panel content */}
          <div className="px-5 pb-8 pt-2">{panelContent}</div>

          {/* Sticky apply button */}
          <div className="sticky bottom-0 border-t border-[#E5E5EA] bg-white px-5 py-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-full rounded-full bg-[#1A3D2E] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se resultater
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Desktop: sticky sidebar                                             */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className="hidden lg:block w-64 shrink-0"
        aria-label="Produktfiltre"
      >
        <div className="sticky top-24 rounded-2xl border border-[#E5E5EA] bg-white p-5">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111111]">
              Filtre
              {activeCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A3D2E] text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#1A3D2E] hover:underline"
              >
                Ryd alle
              </button>
            )}
          </div>

          {panelContent}
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Usage example — drop-in wrapper for the iphones page "Alle iPhones" grid
// ---------------------------------------------------------------------------
//
// In iphones/page.tsx, convert the "Alle iPhones" section into a client
// component and pass it the server-fetched templates:
//
//   // src/components/product/filtered-grid.tsx  (new client component)
//   "use client";
//   import { useState } from "react";
//   import { CategoryFilters } from "@/components/product/category-filters";
//   import { ProductGridCard } from "@/components/product/product-grid-card";
//   import type { ProductTemplate } from "@/lib/supabase/platform-types";
//
//   interface TemplateWithStock extends ProductTemplate {
//     device_count: number;
//     min_price: number | null;
//     locations: { name: string; type: string; count: number }[];
//   }
//
//   export function FilteredGrid({ templates }: { templates: TemplateWithStock[] }) {
//     const [visible, setVisible] = useState(templates);
//     return (
//       <div className="flex gap-8">
//         <CategoryFilters templates={templates} onFilter={setVisible} />
//         <div className="flex-1">
//           <p className="mb-4 text-sm text-[#6E6E73]">
//             Viser {visible.length} af {templates.length} modeller
//           </p>
//           {visible.length === 0 ? (
//             <p className="py-16 text-center text-sm text-[#6E6E73]">
//               Ingen modeller matcher dine filtre. Prøv at ryd filtrene.
//             </p>
//           ) : (
//             <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
//               {visible.map((t) => (
//                 <ProductGridCard
//                   key={t.id}
//                   slug={t.slug}
//                   image={t.images[0]}
//                   title={t.display_name}
//                   minPrice={t.min_price}
//                   deviceCount={t.device_count}
//                   locations={t.locations}
//                   brand={t.brand}
//                   category={t.category}
//                 />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }
//
// Then in iphones/page.tsx, replace the "Alle iPhones" SectionWrapper with:
//   import { FilteredGrid } from "@/components/product/filtered-grid";
//   ...
//   <SectionWrapper>
//     <FilteredGrid templates={templates} />
//   </SectionWrapper>
