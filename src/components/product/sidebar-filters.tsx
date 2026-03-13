"use client";

import { useState } from "react";

export type FilterState = {
  brands?: string[];
  storage?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

type SidebarFiltersProps = {
  brands: string[];
  storages: string[];
  colors: string[];
  priceRange: [number, number];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

/** Map color names to hex for swatches */
const COLOR_HEX: Record<string, string> = {
  sort: "#1d1d1f",
  black: "#1d1d1f",
  hvid: "#f5f5f0",
  white: "#f5f5f0",
  sølv: "#e3e3e3",
  silver: "#e3e3e3",
  guld: "#d4a574",
  gold: "#d4a574",
  blå: "#3b6ea5",
  blue: "#3b6ea5",
  grøn: "#4a6741",
  green: "#4a6741",
  rød: "#bf0013",
  red: "#bf0013",
  lilla: "#8b6fa5",
  purple: "#8b6fa5",
  rosa: "#f4c2c2",
  pink: "#f4c2c2",
  "space gray": "#535150",
  "space grey": "#535150",
  midnight: "#1d1d1f",
  starlight: "#f5e6d3",
  graphite: "#4a4845",
  natural: "#e0cbb1",
};

function getHex(color: string): string {
  return COLOR_HEX[color.toLowerCase()] ?? "#9ca3af";
}

export function SidebarFilters({
  brands,
  storages,
  colors,
  priceRange,
  filters,
  onChange,
}: SidebarFiltersProps) {
  const [minInput, setMinInput] = useState(
    filters.minPrice != null ? String(Math.round(filters.minPrice / 100)) : ""
  );
  const [maxInput, setMaxInput] = useState(
    filters.maxPrice != null ? String(Math.round(filters.maxPrice / 100)) : ""
  );

  const selectedBrands = filters.brands ?? [];

  function toggleBrand(brand: string) {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    onChange({ ...filters, brands: next.length > 0 ? next : undefined });
  }

  function setStorage(storage: string) {
    onChange({
      ...filters,
      storage: filters.storage === storage ? undefined : storage,
    });
  }

  function setColor(color: string) {
    onChange({
      ...filters,
      color: filters.color === color ? undefined : color,
    });
  }

  function applyPrice() {
    const min = minInput ? parseInt(minInput) * 100 : undefined;
    const max = maxInput ? parseInt(maxInput) * 100 : undefined;
    onChange({ ...filters, minPrice: min, maxPrice: max });
  }

  function clearAll() {
    setMinInput("");
    setMaxInput("");
    onChange({});
  }

  const hasFilters =
    selectedBrands.length > 0 ||
    filters.storage != null ||
    filters.color != null ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.inStock != null;

  return (
    <aside className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-charcoal">Filtre</h2>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm font-medium text-green-eco hover:underline"
          >
            Ryd filtre
          </button>
        )}
      </div>

      {/* In stock toggle */}
      <div className="flex items-center justify-between rounded-xl border border-sand bg-white px-4 py-3">
        <span className="text-sm font-medium text-charcoal">Kun på lager</span>
        <button
          role="switch"
          aria-checked={filters.inStock ?? false}
          onClick={() =>
            onChange({ ...filters, inStock: filters.inStock ? undefined : true })
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            filters.inStock ? "bg-green-eco" : "bg-sand"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              filters.inStock ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-charcoal">Mærke</h3>
          <div className="space-y-2">
            {brands.map((brand) => {
              const checked = selectedBrands.includes(brand);
              return (
                <label
                  key={brand}
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <span
                    onClick={() => toggleBrand(brand)}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      checked
                        ? "border-green-eco bg-green-eco"
                        : "border-sand bg-white hover:border-charcoal/40"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-white">
                        <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    onClick={() => toggleBrand(brand)}
                    className="text-sm text-charcoal"
                  >
                    {brand}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage filter */}
      {storages.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-charcoal">Lagerplads</h3>
          <div className="flex flex-wrap gap-2">
            {storages.map((s) => (
              <button
                key={s}
                onClick={() => setStorage(s)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.storage === s
                    ? "border-green-eco bg-green-eco text-white"
                    : "border-sand bg-white text-charcoal hover:border-charcoal/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-charcoal">Pris (kr.)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={String(Math.round(priceRange[0] / 100))}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={applyPrice}
            className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
          />
          <span className="shrink-0 text-sm text-gray">–</span>
          <input
            type="number"
            placeholder={String(Math.round(priceRange[1] / 100))}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={applyPrice}
            className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
          />
        </div>
      </div>

      {/* Color filter */}
      {colors.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-charcoal">Farve</h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const isSelected = filters.color === c;
              const hex = getHex(c);
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-green-eco ring-2 ring-green-eco/20"
                      : "border-sand hover:border-charcoal/30"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: hex }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
