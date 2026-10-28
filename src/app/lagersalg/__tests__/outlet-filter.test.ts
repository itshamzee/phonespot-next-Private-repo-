import { describe, expect, it } from "vitest";
import { applyOutletFilters, facetOptions, EMPTY_FILTERS, type OutletItem } from "../outlet-filter";

const item = (o: Partial<OutletItem> & { id: string }): OutletItem => ({
  name: `Cover ${o.id}`,
  slug: null,
  category: "covers",
  brand: null,
  priceOre: 7900,
  imageUrl: null,
  stock: 1,
  orderable: false,
  models: [{ slug: "samsung-s22", label: "Galaxy S22", brand: "samsung" }],
  color: null,
  type: "Cover",
  listPriceKr: null,
  createdAt: "2026-10-28T10:00:00Z",
  ...o,
});

const items: OutletItem[] = [
  item({ id: "a", priceOre: 5900, color: "Sort", type: "Pungcover" }),
  item({ id: "b", priceOre: 9900, color: "Rød", type: "Flipcover", models: [{ slug: "samsung-s21", label: "Galaxy S21", brand: "samsung" }] }),
  item({ id: "c", priceOre: 7900, color: "Sort", models: [{ slug: "iphone-13", label: "iPhone 13", brand: "apple" }] }),
];

describe("applyOutletFilters", () => {
  it("returns everything without filters", () => {
    expect(applyOutletFilters(items, EMPTY_FILTERS).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("only returns covers made for the chosen model", () => {
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, models: ["samsung-s21"] }).map((i) => i.id)).toEqual(["b"]);
  });

  it("combines filters across groups with AND and within a group with OR", () => {
    const r = applyOutletFilters(items, { ...EMPTY_FILTERS, colors: ["Sort", "Rød"], brands: ["samsung"] });
    expect(r.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("filters on price points", () => {
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, prices: [5900, 7900] }).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("matches free text on model names, also without Galaxy", () => {
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, query: "s21" }).map((i) => i.id)).toEqual(["b"]);
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, query: "galaxy s22" }).map((i) => i.id)).toEqual(["a"]);
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, query: "iphone13" }).map((i) => i.id)).toEqual(["c"]);
  });

  it("sorts by price both ways", () => {
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, sort: "price-asc" }).map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, sort: "price-desc" }).map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
});

describe("facetOptions", () => {
  it("lists only values that exist, with counts under the other active filters", () => {
    const f = facetOptions(items, { ...EMPTY_FILTERS, colors: ["Sort"] });
    expect(f.colors).toEqual([
      { value: "Sort", label: "Sort", count: 2 },
      { value: "Rød", label: "Rød", count: 1 },
    ]);
    // Brand counts respect the colour filter: only black covers count.
    expect(f.brands).toEqual([
      { value: "apple", label: "Apple", count: 1 },
      { value: "samsung", label: "Samsung", count: 1 },
    ]);
    expect(f.prices.map((p) => p.value)).toEqual([5900, 7900]);
  });

  it("narrows the model list to the chosen phone brand", () => {
    const f = facetOptions(items, { ...EMPTY_FILTERS, brands: ["apple"] });
    expect(f.models.map((m) => m.value)).toEqual(["iphone-13"]);
  });
});
