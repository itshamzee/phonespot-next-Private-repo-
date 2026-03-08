// src/lib/tilbehoer-filters.ts

import type { Product } from "@/lib/shopify/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TilbehoerSearchParams {
  pris?: string;
  brand?: string;
  sort?: string;
  side?: string;
}

export interface FilterState {
  priceRanges: [number, number | null][];
  brands: string[];
  sort: SortOption;
  page: number;
}

export type SortOption = "bestselling" | "price-asc" | "price-desc" | "newest";

export interface PriceRange {
  label: string;
  value: string;
  min: number;
  max: number | null;
}

export const PRICE_RANGES: PriceRange[] = [
  { label: "Under 100 kr", value: "0-99", min: 0, max: 99 },
  { label: "100-199 kr", value: "100-199", min: 100, max: 199 },
  { label: "200-299 kr", value: "200-299", min: 200, max: 299 },
  { label: "300+ kr", value: "300", min: 300, max: null },
];

export const PAGE_SIZE = 40;

// ---------------------------------------------------------------------------
// Parse search params into filter state
// ---------------------------------------------------------------------------

export function parseFilters(params: TilbehoerSearchParams): FilterState {
  const priceRanges: [number, number | null][] = [];
  if (params.pris) {
    for (const range of params.pris.split(",")) {
      const match = PRICE_RANGES.find((pr) => pr.value === range);
      if (match) priceRanges.push([match.min, match.max]);
    }
  }

  const brands = params.brand
    ? params.brand.split(",").map((b) => b.trim().toLowerCase())
    : [];

  const validSorts: SortOption[] = ["price-asc", "price-desc", "newest"];
  const sort: SortOption = validSorts.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : "bestselling";

  const page = Math.max(1, parseInt(params.side ?? "1", 10) || 1);

  return { priceRanges, brands, sort, page };
}

// ---------------------------------------------------------------------------
// Get product price as number
// ---------------------------------------------------------------------------

function getProductPrice(product: Product): number {
  return parseFloat(product.priceRange.minVariantPrice.amount);
}

// ---------------------------------------------------------------------------
// Filter products
// ---------------------------------------------------------------------------

export function filterProducts(
  products: Product[],
  filters: FilterState,
): Product[] {
  let result = [...products];

  if (filters.priceRanges.length > 0) {
    result = result.filter((p) => {
      const price = getProductPrice(p);
      return filters.priceRanges.some(([min, max]) => {
        if (max === null) return price >= min;
        return price >= min && price <= max;
      });
    });
  }

  if (filters.brands.length > 0) {
    result = result.filter((p) =>
      filters.brands.includes(p.vendor.toLowerCase()),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sort products
// ---------------------------------------------------------------------------

export function sortProducts(
  products: Product[],
  sort: SortOption,
): Product[] {
  const sorted = [...products];

  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => getProductPrice(a) - getProductPrice(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => getProductPrice(b) - getProductPrice(a));
      break;
    case "newest":
      sorted.reverse();
      break;
    case "bestselling":
    default:
      break;
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Paginate products
// ---------------------------------------------------------------------------

export function paginateProducts(
  products: Product[],
  page: number,
): { products: Product[]; totalCount: number; totalPages: number } {
  const totalCount = products.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  return {
    products: products.slice(start, end),
    totalCount,
    totalPages,
  };
}

// ---------------------------------------------------------------------------
// Extract available brands from products (for filter UI)
// ---------------------------------------------------------------------------

export function extractBrands(products: Product[]): { name: string; count: number }[] {
  const brandMap = new Map<string, number>();

  for (const p of products) {
    const vendor = p.vendor;
    if (vendor) {
      brandMap.set(vendor, (brandMap.get(vendor) ?? 0) + 1);
    }
  }

  return Array.from(brandMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Build URL with updated filter params
// ---------------------------------------------------------------------------

export function buildFilterUrl(
  basePath: string,
  currentParams: TilbehoerSearchParams,
  updates: Partial<TilbehoerSearchParams>,
): string {
  const merged = { ...currentParams, ...updates };
  const params = new URLSearchParams();

  if (merged.pris) params.set("pris", merged.pris);
  if (merged.brand) params.set("brand", merged.brand);
  if (merged.sort && merged.sort !== "bestselling") params.set("sort", merged.sort);
  if (merged.side && merged.side !== "1") params.set("side", merged.side);

  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
