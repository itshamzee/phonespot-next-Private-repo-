import { describe, expect, it } from "vitest";
import { applyOutletFilters, facetOptions, kindOf, scopeToModel, selectModels, EMPTY_FILTERS, type OutletItem } from "../outlet-filter";

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
  kind: "cover",
  laptopSize: null,
  bagType: null,
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

const bag = (size: string, id = `bag-${size}`): OutletItem =>
  item({ id, category: "outlet", kind: "bag", laptopSize: size, bagType: "Sleeve", type: "Sleeve", models: [] });
const cover = (model: string, id = `cover-${model}`): OutletItem =>
  item({ id, models: [{ slug: model, label: model, brand: model.startsWith("iphone") || model.startsWith("ipad") ? "apple" : "samsung" }] });

describe("varetyper", () => {
  it("klassificerer varetyper", () => {
    expect(kindOf({ subcategory: "bag", models: [] })).toBe("bag");
    expect(kindOf({ subcategory: "cover", models: ["ipad-10"] })).toBe("ipad");
    expect(kindOf({ subcategory: "cover", models: ["iphone-15", "ipad-10"] })).toBe("cover");
    expect(kindOf({ subcategory: "charger", models: [] })).toBe("other");
  });

  it("filtrerer på varetype og størrelse", () => {
    const items = [bag('13"'), bag('15"/15,6"'), cover("iphone-15")];
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, kinds: ["bag"], sizes: ['13"'] })).toHaveLength(1);
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, kinds: ["bag"] })).toHaveLength(2);
    expect(applyOutletFilters(items, { ...EMPTY_FILTERS, kinds: ["cover"] }).map((i) => i.id)).toEqual(["cover-iphone-15"]);
  });

  it("modelfacetten ignorerer tasker", () => {
    const withModel = { ...bag('13"', "odd-bag"), models: [{ slug: "iphone-15", label: "iPhone 15", brand: "apple" }] };
    const f = facetOptions([withModel, bag('14"'), cover("iphone-15")], EMPTY_FILTERS);
    expect(f.models).toEqual([{ value: "iphone-15", label: "iphone-15", count: 1 }]);
    expect(f.brands.map((b) => b.count)).toEqual([1]);
  });

  it("giver varetyper i fast rækkefølge og størrelser kun for tasker", () => {
    const other = item({ id: "o", kind: "other", type: "Oplader", models: [] });
    const ipad = cover("ipad-10", "i");
    const ipadItem = { ...ipad, kind: "ipad" as const };
    const f = facetOptions([other, bag('15"/15,6"'), bag('13"'), cover("iphone-15"), ipadItem, cover("iphone-14")], EMPTY_FILTERS);
    expect(f.kinds).toEqual([
      { value: "cover", label: "Covers", count: 2 },
      { value: "ipad", label: "iPad", count: 1 },
      { value: "bag", label: "Tasker", count: 2 },
      { value: "other", label: "Andet", count: 1 },
    ]);
    expect(f.sizes.map((s) => s.value)).toEqual(['13"', '15"/15,6"']);
    expect(f.sizes.every((s) => s.label === s.value && s.count === 1)).toBe(true);
  });
});

describe("én valgt model", () => {
  const charger = item({ id: "charger", kind: "other", type: "Oplader", models: [{ slug: "iphone-15", label: "iPhone 15", brand: "apple" }] });
  const ipadCover = { ...cover("ipad-10", "ipad-cover"), kind: "ipad" as const };
  const all = [cover("iphone-15", "c15"), charger, bag('13"'), ipadCover];

  it("viser kun covers og iPad-covers til modellen", () => {
    expect(applyOutletFilters(all, { ...EMPTY_FILTERS, models: ["iphone-15"], kinds: ["cover", "ipad"] }).map((i) => i.id)).toEqual(["c15"]);
    expect(applyOutletFilters(all, scopeToModel({ ...EMPTY_FILTERS, models: ["iphone-15"] })).map((i) => i.id)).toEqual(["c15"]);
  });

  it("slipper varetype-begrænsningen igen uden model", () => {
    expect(scopeToModel(EMPTY_FILTERS)).toEqual(EMPTY_FILTERS);
    expect(scopeToModel({ ...EMPTY_FILTERS, models: ["a", "b"] }).kinds).toEqual([]);
  });

  it("en taske matcher aldrig en model", () => {
    const tagged = { ...bag('13"', "tagged"), models: [{ slug: "iphone-15", label: "iPhone 15", brand: "apple" }] };
    expect(applyOutletFilters([tagged], { ...EMPTY_FILTERS, models: ["iphone-15"] })).toHaveLength(0);
  });

  it("modelvalg under Tasker eller iPad nulstiller varetypen", () => {
    const fromBag = selectModels(all, { ...EMPTY_FILTERS, kinds: ["bag"], sizes: ['13"'] }, ["iphone-15"]);
    expect(fromBag).toMatchObject({ models: ["iphone-15"], kinds: [], sizes: [] });
    expect(applyOutletFilters(all, scopeToModel(fromBag)).map((i) => i.id)).toEqual(["c15"]);
    expect(selectModels(all, { ...EMPTY_FILTERS, kinds: ["ipad"] }, ["iphone-15"]).kinds).toEqual([]);
    expect(selectModels(all, { ...EMPTY_FILTERS, kinds: ["ipad"] }, ["ipad-10"]).kinds).toEqual(["ipad"]);
    expect(selectModels(all, { ...EMPTY_FILTERS, kinds: ["cover"] }, []).kinds).toEqual(["cover"]);
  });
});
