"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { TemplateWithStock } from "@/components/product/filtered-grid";

type SortOption = "price_asc" | "price_desc" | "popular" | "newest";
type Grade = "A" | "B" | "C";

interface FilterState {
  priceMin: string;
  priceMax: string;
  grades: Set<Grade>;
  storageOptions: Set<string>;
  onlyInStock: boolean;
  onlyPickup: boolean;
  sort: SortOption;
  brands: Set<string>;
  screenSizes: Set<string>;
  ramOptions: Set<string>;
  processorTypes: Set<string>;
}

interface CategoryFiltersProps {
  templates: TemplateWithStock[];
  onFilter: (filtered: TemplateWithStock[]) => void;
  resultCount: number;
  heading?: string;
  initialBrand?: string;
}

const SORT_LABELS: Record<SortOption, string> = {
  price_asc: "Pris, lav til høj",
  price_desc: "Pris, høj til lav",
  popular: "Flest på lager",
  newest: "Nyeste modeller",
};

const QUICK_PRICES = [
  { label: "Under 2.000", min: "", max: "2000" },
  { label: "2.000–4.000", min: "2000", max: "4000" },
  { label: "4.000–6.000", min: "4000", max: "6000" },
  { label: "Over 6.000", min: "6000", max: "" },
] as const;

const GRADES: { grade: Grade; label: string; description: string }[] = [
  { grade: "A", label: "Stand A", description: "Meget flot" },
  { grade: "B", label: "Stand B", description: "Almindelige brugsspor" },
  { grade: "C", label: "Stand C", description: "Tydelige brugsspor" },
];

function normaliseStorage(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normaliseRam(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normaliseScreenSize(value: string) {
  return `${value.replace(/["\u201D\u2033]/g, "").replace(/\s+/g, "").replace(/\.0$/, "")}"`;
}

function detectProcessorType(value: string): string | null {
  const processor = value.toLowerCase();
  if (processor.includes("intel") || processor.includes("core i") || /i[3579]-/.test(processor)) return "Intel";
  if (processor.includes("amd") || processor.includes("ryzen")) return "AMD";
  if (processor.includes("apple") || /\bm[1-4]\b/.test(processor)) return "Apple";
  return null;
}

function toOre(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  return digits ? Number.parseInt(digits, 10) * 100 : null;
}

function defaultState(): FilterState {
  return {
    priceMin: "",
    priceMax: "",
    grades: new Set(),
    storageOptions: new Set(),
    onlyInStock: false,
    onlyPickup: false,
    sort: "price_asc",
    brands: new Set(),
    screenSizes: new Set(),
    ramOptions: new Set(),
    processorTypes: new Set(),
  };
}

function initialState(templates: TemplateWithStock[], requestedBrand?: string): FilterState {
  const state = defaultState();
  if (!requestedBrand) return state;
  const brand = templates.map((template) => template.brand).find(
    (candidate) => candidate.toLowerCase() === requestedBrand.toLowerCase(),
  );
  if (brand) state.brands.add(brand);
  return state;
}

function countActiveFilters(state: FilterState) {
  return (
    (state.priceMin || state.priceMax ? 1 : 0) +
    state.grades.size +
    state.storageOptions.size +
    Number(state.onlyInStock) +
    Number(state.onlyPickup) +
    state.brands.size +
    state.screenSizes.size +
    state.ramOptions.size +
    state.processorTypes.size
  );
}

export function applyCategoryFilters(templates: TemplateWithStock[], state: FilterState): TemplateWithStock[] {
  const minPrice = toOre(state.priceMin);
  const maxPrice = toOre(state.priceMax);
  const filtered = templates.filter((template) => {
    if (minPrice !== null && (template.min_price === null || template.min_price < minPrice)) return false;
    if (maxPrice !== null && (template.min_price === null || template.min_price > maxPrice)) return false;
    if (state.grades.size > 0 && !(
      (state.grades.has("A") && template.base_price_a !== null) ||
      (state.grades.has("B") && template.base_price_b !== null) ||
      (state.grades.has("C") && template.base_price_c !== null)
    )) return false;
    if (state.storageOptions.size > 0 && !(template.storage_options ?? []).some(
      (value) => state.storageOptions.has(normaliseStorage(value)),
    )) return false;
    if (state.onlyInStock && template.device_count <= 0) return false;
    if (state.onlyPickup && !template.locations.some(
      (location) => location.type === "store" && location.count > 0,
    )) return false;
    if (state.brands.size > 0 && !state.brands.has(template.brand)) return false;

    const screenSize = template.specifications?.screen_size;
    if (state.screenSizes.size > 0 && (!screenSize || !state.screenSizes.has(normaliseScreenSize(screenSize)))) return false;
    const ram = template.specifications?.ram;
    if (state.ramOptions.size > 0 && (!ram || !state.ramOptions.has(normaliseRam(ram)))) return false;
    const processor = template.specifications?.processor;
    if (state.processorTypes.size > 0) {
      const type = processor ? detectProcessorType(processor) : null;
      if (!type || !state.processorTypes.has(type)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const ownStockOrder = Number(b.has_own_stock) - Number(a.has_own_stock);
    if (ownStockOrder) return ownStockOrder;
    if (state.sort === "price_asc") return (a.min_price ?? Infinity) - (b.min_price ?? Infinity);
    if (state.sort === "price_desc") return (b.min_price ?? -Infinity) - (a.min_price ?? -Infinity);
    if (state.sort === "popular") return b.device_count - a.device_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function keepAvailable(selected: Set<string>, available: Set<string>) {
  return new Set([...selected].filter((value) => available.has(value)));
}

interface InertSnapshot {
  element: HTMLElement;
  hadInert: boolean;
  ariaHidden: string | null;
}

function makePageBackgroundInert(layer: HTMLElement): InertSnapshot[] {
  const snapshots: InertSnapshot[] = [];
  let activeBranch = layer;

  while (activeBranch.parentElement) {
    const parent = activeBranch.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === activeBranch || !(sibling instanceof HTMLElement)) continue;
      snapshots.push({
        element: sibling,
        hadInert: sibling.hasAttribute("inert"),
        ariaHidden: sibling.getAttribute("aria-hidden"),
      });
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }
    if (parent === document.body) break;
    activeBranch = parent;
  }

  return snapshots;
}

function restorePageBackground(snapshots: InertSnapshot[]) {
  for (const { element, hadInert, ariaHidden } of snapshots) {
    if (!hadInert) element.removeAttribute("inert");
    if (ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", ariaHidden);
  }
}

function SectionButton({ label, open, controls, onClick }: {
  label: string;
  open: boolean;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-expanded={open} aria-controls={controls} onClick={onClick} className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#202421]">
      {label}<span aria-hidden="true" className="text-lg font-normal text-[#1A3D2E]">{open ? "−" : "+"}</span>
    </button>
  );
}

export function CategoryFilters({ templates, onFilter, resultCount, heading, initialBrand }: CategoryFiltersProps) {
  const [filters, setFilters] = useState(() => initialState(templates, initialBrand));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ sort: true, brand: false, screen: false, ram: false, processor: false, price: true, grade: true, storage: false, availability: true });
  const idBase = useId().replace(/:/g, "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const restoreTriggerFocusRef = useRef(false);

  const isLaptop = templates.some((template) => ["laptop", "macbook"].includes(template.category.toLowerCase()));
  const options = useMemo(() => {
    const storage = new Set<string>();
    const brands = new Map<string, number>();
    const screens = new Set<string>();
    const ram = new Set<string>();
    const processors = new Map<string, number>();
    for (const template of templates) {
      (template.storage_options ?? []).forEach((value) => storage.add(normaliseStorage(value)));
      brands.set(template.brand, (brands.get(template.brand) ?? 0) + 1);
      if (template.specifications?.screen_size) screens.add(normaliseScreenSize(template.specifications.screen_size));
      if (template.specifications?.ram) ram.add(normaliseRam(template.specifications.ram));
      if (template.specifications?.processor) {
        const type = detectProcessorType(template.specifications.processor);
        if (type) processors.set(type, (processors.get(type) ?? 0) + 1);
      }
    }
    const numericSort = (a: string, b: string) => Number.parseFloat(a) - Number.parseFloat(b);
    return {
      storage: [...storage].sort(numericSort),
      brands: [...brands].sort((a, b) => b[1] - a[1]),
      screens: [...screens].sort(numericSort),
      ram: [...ram].sort(numericSort),
      processors: [...processors].sort((a, b) => b[1] - a[1]),
    };
  }, [templates]);

  const effectiveFilters = useMemo(() => ({
    ...filters,
    brands: keepAvailable(filters.brands, new Set(options.brands.map(([brand]) => brand))),
    screenSizes: keepAvailable(filters.screenSizes, new Set(options.screens)),
    ramOptions: keepAvailable(filters.ramOptions, new Set(options.ram)),
    processorTypes: keepAvailable(filters.processorTypes, new Set(options.processors.map(([type]) => type))),
    storageOptions: keepAvailable(filters.storageOptions, new Set(options.storage)),
  }), [filters, options]);

  const filtered = useMemo(() => applyCategoryFilters(templates, effectiveFilters), [effectiveFilters, templates]);
  useEffect(() => onFilter(filtered), [filtered, onFilter]);

  const closeDrawer = useCallback(() => {
    restoreTriggerFocusRef.current = true;
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (!drawerOpen && restoreTriggerFocusRef.current) {
      restoreTriggerFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const inertSnapshots = layerRef.current ? makePageBackgroundInert(layerRef.current) : [];
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const focusableElements = () => dialogRef.current
      ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      : [];
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = focusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        closeRef.current?.focus();
      }
    };
    const desktopQuery = window.matchMedia?.("(min-width: 1024px)");
    const handleDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    desktopQuery?.addEventListener("change", handleDesktop);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      desktopQuery?.removeEventListener("change", handleDesktop);
      document.body.style.overflow = previousOverflow;
      restorePageBackground(inertSnapshots);
    };
  }, [closeDrawer, drawerOpen]);

  const activeCount = countActiveFilters(effectiveFilters);
  const toggleSection = (section: keyof typeof openSections) => setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  const toggleSet = (key: "grades" | "storageOptions" | "brands" | "screenSizes" | "ramOptions" | "processorTypes", value: string, checked: boolean) => setFilters((current) => {
    const next = new Set(current[key] as Set<string>);
    if (checked) next.add(value);
    else next.delete(value);
    return { ...current, [key]: next };
  });
  const reset = () => setFilters(defaultState());

  const panel = (surface: "desktop" | "mobile") => {
    const section = (name: keyof typeof openSections) => `${idBase}-${surface}-${name}`;
    return (
      <div className="divide-y divide-[#DDE2DD]">
        <div>
          <SectionButton label="Sortering" open={openSections.sort} controls={section("sort")} onClick={() => toggleSection("sort")} />
          {openSections.sort && <div id={section("sort")} className="pb-4">
            <label className="sr-only" htmlFor={`${idBase}-${surface}-sort-control`}>Sortering</label>
            <select id={`${idBase}-${surface}-sort-control`} value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as SortOption }))} className="w-full rounded-md border border-[#DDE2DD] bg-white px-3 py-2.5 text-sm text-[#202421] focus:border-[#1A3D2E] focus:outline-none">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((value) => <option key={value} value={value}>{SORT_LABELS[value]}</option>)}
            </select>
          </div>}
        </div>

        {options.brands.length > 1 && <div>
          <SectionButton label="Mærke" open={openSections.brand} controls={section("brand")} onClick={() => toggleSection("brand")} />
          {openSections.brand && <div id={section("brand")} className="space-y-1 pb-4">{options.brands.map(([brand, count]) => (
            <label key={brand} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm"><input type="checkbox" checked={filters.brands.has(brand)} onChange={(event) => toggleSet("brands", brand, event.target.checked)} className="h-4 w-4 accent-[#1A3D2E]" /><span className="flex-1">{brand}</span><span className="text-xs text-[#687069]">{count}</span></label>
          ))}</div>}
        </div>}

        {isLaptop && options.screens.length > 0 && <div>
          <SectionButton label="Skærmstørrelse" open={openSections.screen} controls={section("screen")} onClick={() => toggleSection("screen")} />
          {openSections.screen && <div id={section("screen")} className="flex flex-wrap gap-2 pb-4">{options.screens.map((value) => <button type="button" key={value} aria-pressed={filters.screenSizes.has(value)} onClick={() => toggleSet("screenSizes", value, !filters.screenSizes.has(value))} className="rounded-md border border-[#DDE2DD] px-3 py-2 text-xs aria-pressed:border-[#1A3D2E] aria-pressed:bg-[#1A3D2E] aria-pressed:text-white">{value}</button>)}</div>}
        </div>}

        {isLaptop && options.ram.length > 0 && <div>
          <SectionButton label="RAM" open={openSections.ram} controls={section("ram")} onClick={() => toggleSection("ram")} />
          {openSections.ram && <div id={section("ram")} className="flex flex-wrap gap-2 pb-4">{options.ram.map((value) => <button type="button" key={value} aria-pressed={filters.ramOptions.has(value)} onClick={() => toggleSet("ramOptions", value, !filters.ramOptions.has(value))} className="rounded-md border border-[#DDE2DD] px-3 py-2 text-xs aria-pressed:border-[#1A3D2E] aria-pressed:bg-[#1A3D2E] aria-pressed:text-white">{value}</button>)}</div>}
        </div>}

        {isLaptop && options.processors.length > 0 && <div>
          <SectionButton label="Processor" open={openSections.processor} controls={section("processor")} onClick={() => toggleSection("processor")} />
          {openSections.processor && <div id={section("processor")} className="space-y-1 pb-4">{options.processors.map(([value, count]) => <label key={value} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm"><input type="checkbox" checked={filters.processorTypes.has(value)} onChange={(event) => toggleSet("processorTypes", value, event.target.checked)} className="h-4 w-4 accent-[#1A3D2E]" /><span className="flex-1">{value}</span><span className="text-xs text-[#687069]">{count}</span></label>)}</div>}
        </div>}

        <div>
          <SectionButton label="Pris" open={openSections.price} controls={section("price")} onClick={() => toggleSection("price")} />
          {openSections.price && <div id={section("price")} className="space-y-3 pb-4">
            <div className="flex flex-wrap gap-1.5">{QUICK_PRICES.map((price) => <button type="button" key={price.label} onClick={() => setFilters((current) => ({ ...current, priceMin: price.min, priceMax: price.max }))} className="rounded-md border border-[#DDE2DD] px-2.5 py-2 text-xs">{price.label}</button>)}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[#687069]">Minimumspris<input aria-label="Minimumspris" inputMode="numeric" value={filters.priceMin} onChange={(event) => setFilters((current) => ({ ...current, priceMin: event.target.value }))} className="mt-1 w-full rounded-md border border-[#DDE2DD] px-3 py-2 text-sm text-[#202421]" /></label>
              <label className="text-xs text-[#687069]">Maksimumspris<input aria-label="Maksimumspris" inputMode="numeric" value={filters.priceMax} onChange={(event) => setFilters((current) => ({ ...current, priceMax: event.target.value }))} className="mt-1 w-full rounded-md border border-[#DDE2DD] px-3 py-2 text-sm text-[#202421]" /></label>
            </div>
          </div>}
        </div>

        <div>
          <SectionButton label="Stand" open={openSections.grade} controls={section("grade")} onClick={() => toggleSection("grade")} />
          {openSections.grade && <div id={section("grade")} className="space-y-1 pb-4">{GRADES.map(({ grade, label, description }) => <label key={grade} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm"><input type="checkbox" checked={filters.grades.has(grade)} onChange={(event) => toggleSet("grades", grade, event.target.checked)} className="h-4 w-4 accent-[#1A3D2E]" /><span><span className="block font-medium">{label}</span><span className="block text-xs text-[#687069]">{description}</span></span></label>)}</div>}
        </div>

        {options.storage.length > 0 && <div>
          <SectionButton label="Lagerplads" open={openSections.storage} controls={section("storage")} onClick={() => toggleSection("storage")} />
          {openSections.storage && <div id={section("storage")} className="flex flex-wrap gap-2 pb-4">{options.storage.map((value) => <button type="button" key={value} aria-pressed={filters.storageOptions.has(value)} onClick={() => toggleSet("storageOptions", value, !filters.storageOptions.has(value))} className="rounded-md border border-[#DDE2DD] px-3 py-2 text-xs aria-pressed:border-[#1A3D2E] aria-pressed:bg-[#1A3D2E] aria-pressed:text-white">{value}</button>)}</div>}
        </div>}

        <div>
          <SectionButton label="Tilgængelighed" open={openSections.availability} controls={section("availability")} onClick={() => toggleSection("availability")} />
          {openSections.availability && <div id={section("availability")} className="space-y-2 pb-4"><label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={filters.onlyInStock} onChange={(event) => setFilters((current) => ({ ...current, onlyInStock: event.target.checked }))} className="h-4 w-4 accent-[#1A3D2E]" />Kun modeller på lager</label><label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={filters.onlyPickup} onChange={(event) => setFilters((current) => ({ ...current, onlyPickup: event.target.checked }))} className="h-4 w-4 accent-[#1A3D2E]" />Kan afhentes i butik</label></div>}
        </div>

        {surface === "mobile" && activeCount > 0 && <div className="pt-4"><button type="button" onClick={reset} className="w-full rounded-md border border-[#BFC8C0] px-4 py-2.5 text-sm font-semibold text-[#1A3D2E]">Ryd filtre</button></div>}
      </div>
    );
  };

  const resultLabel = `${resultCount} ${resultCount === 1 ? "model" : "modeller"}`;
  return <>
    <div className="sticky top-0 z-30 col-span-full -mx-4 flex items-center justify-between gap-3 border-y border-[#DDE2DD] bg-white px-4 py-3 lg:hidden"><div><p className="text-sm font-semibold text-[#202421]">{resultLabel}</p>{heading && <p className="text-xs text-[#687069]">{heading}</p>}</div><button ref={triggerRef} type="button" aria-label={activeCount ? `Filtre, ${activeCount} valgt` : "Filtre"} aria-haspopup="dialog" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} className="mr-14 min-h-11 rounded-md border border-[#BFC8C0] bg-white px-4 text-sm font-semibold text-[#1A3D2E]">Filtre{activeCount > 0 ? ` (${activeCount})` : ""}</button></div>

    <aside aria-label="Produktfiltre" className="hidden w-64 shrink-0 lg:block"><div className="sticky top-4 border-t border-[#1A3D2E] py-1"><div className="flex items-center justify-between border-b border-[#DDE2DD] py-3"><h2 className="text-sm font-semibold text-[#202421]">Filtre</h2>{activeCount > 0 && <button type="button" onClick={reset} className="text-xs font-semibold text-[#1A3D2E]">Ryd filtre</button>}</div>{panel("desktop")}</div></aside>

    {drawerOpen && <div ref={layerRef} className="contents"><button type="button" tabIndex={-1} aria-label="Luk filtre" onClick={closeDrawer} className="fixed inset-0 z-40 bg-black/45" /><div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Produktfiltre" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-2xl lg:hidden"><div className="flex items-center justify-between border-b border-[#DDE2DD] px-5 py-4"><div><h2 className="text-base font-semibold text-[#202421]">Filtre</h2><p className="text-xs text-[#687069]">{resultLabel}</p></div><button ref={closeRef} type="button" onClick={closeDrawer} aria-label="Luk filtre" className="min-h-11 min-w-11 text-2xl text-[#1A3D2E]">×</button></div><div className="overflow-y-auto px-5">{panel("mobile")}</div><div className="border-t border-[#DDE2DD] p-4"><button type="button" onClick={closeDrawer} className="min-h-11 w-full rounded-md bg-[#1A3D2E] px-4 text-sm font-semibold text-white">Vis {resultLabel}</button></div></div></div>}
  </>;
}
