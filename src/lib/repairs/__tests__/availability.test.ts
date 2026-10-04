// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  availableQty,
  canSeeCost,
  groupByCategory,
  inStockHere,
  parseLocationParam,
  recommendedServiceId,
  shapeStock,
  stripPartCost,
} from "../availability";
import { buildCatalogTree, buildServicesResponse, buildUpsellResponse, compatibleNameVariants, sanitizeSearch } from "../catalog";
import type { RepairServiceOption } from "../new-case-types";

const LOC = { vejle: "L-V", slagelse: "L-S", webshop: "L-W" } as const;

describe("availableQty", () => {
  it("is quantity minus reserved, never below 0", () => {
    expect(availableQty({ quantity: 5, reserved_qty: 2 })).toBe(3);
    expect(availableQty({ quantity: 1, reserved_qty: 4 })).toBe(0);
    expect(availableQty(null)).toBe(0);
    expect(availableQty({ quantity: 3 })).toBe(3);
  });
});

describe("shapeStock", () => {
  const rows = [
    { product_id: "p", location_id: "L-V", quantity: 4, reserved_qty: 1 },
    { product_id: "p", location_id: "L-S", quantity: 2, reserved_qty: 0 },
  ];
  it("always-in-stock is untracked: no counts, nothing blocked", () => {
    const s = shapeStock({ alwaysInStock: true, rows, location: "vejle", locationIdBySlug: LOC });
    expect(s).toEqual({ tracked: false, available: null, other_locations: [], in_transit: 0 });
    expect(inStockHere(s)).toBe(true);
  });
  it("tracked stock shows available here and in the other store", () => {
    const s = shapeStock({ alwaysInStock: false, rows, location: "vejle", locationIdBySlug: LOC, inTransit: 3 });
    expect(s.tracked).toBe(true);
    expect(s.available).toBe(3);
    expect(s.other_locations).toEqual([{ slug: "slagelse", available: 2 }]);
    expect(s.in_transit).toBe(3);
  });
  it("zero available means order it, a missing row counts as 0", () => {
    const s = shapeStock({ alwaysInStock: false, rows: [], location: "slagelse", locationIdBySlug: LOC });
    expect(s.available).toBe(0);
    expect(inStockHere(s)).toBe(false);
    expect(s.other_locations).toEqual([{ slug: "vejle", available: 0 }]);
  });
  it("without a location both stores are listed and available is null", () => {
    const s = shapeStock({ alwaysInStock: false, rows, location: null, locationIdBySlug: LOC });
    expect(s.available).toBeNull();
    expect(s.other_locations.map((o) => o.slug)).toEqual(["vejle", "slagelse"]);
  });
  it("parses the location param", () => {
    expect(parseLocationParam("Vejle")).toBe("vejle");
    expect(parseLocationParam("webshop")).toBeNull();
    expect(parseLocationParam(null)).toBeNull();
  });
});

function svc(id: string, price: number, q: RepairServiceOption["quality_tier"], part: RepairServiceOption["part"]): RepairServiceOption {
  return {
    id,
    slug: id,
    name: id,
    price_dkk: price,
    price_oere: price * 100,
    quality_tier: q,
    quality_label: null,
    estimated_minutes: 30,
    warranty_info: null,
    part_mode: "part",
    part,
  };
}
const inStock = { sku_product_id: "s", title: null, tracked: true, available: 2, other_locations: [], in_transit: 0 };
const empty = { ...inStock, available: 0 };
const untracked = { ...inStock, tracked: false, available: null };

describe("recommendedServiceId", () => {
  it("picks the cheapest quality that is in stock", () => {
    const list = [svc("budget", 500, "standard", empty), svc("oem", 700, "premium", inStock), svc("orig", 900, "original", inStock)];
    expect(recommendedServiceId(list)).toBe("oem");
  });
  it("untracked parts count as in stock", () => {
    const list = [svc("budget", 500, "standard", untracked), svc("oem", 700, "premium", inStock)];
    expect(recommendedServiceId(list)).toBe("budget");
  });
  it("falls back to the cheapest when nothing is in stock; equal price prefers the lower quality", () => {
    expect(recommendedServiceId([svc("a", 900, "original", empty), svc("b", 700, "premium", empty)])).toBe("b");
    expect(recommendedServiceId([svc("p", 700, "premium", empty), svc("s", 700, "standard", empty)])).toBe("s");
    expect(recommendedServiceId([])).toBeNull();
  });
});

describe("groupByCategory", () => {
  it("puts screen and battery first, the rest alphabetically, Øvrige last", () => {
    const list = [svc("k", 1, null, null), svc("b", 1, null, null), svc("s", 1, null, null), svc("x", 1, null, null)];
    const cat: Record<string, string | null> = { k: "Kameraskift", b: "Batteriskift", s: "Skærmskift", x: null };
    const groups = groupByCategory(list, (s) => cat[s.id]);
    expect(groups.map((g) => g.name)).toEqual(["Skærmskift", "Batteriskift", "Kameraskift", "Øvrige"]);
  });
});

describe("cost visibility", () => {
  it("only manager and owner see cost", () => {
    expect(canSeeCost("owner")).toBe(true);
    expect(canSeeCost("manager")).toBe(true);
    expect(canSeeCost("staff")).toBe(false);
    expect(canSeeCost(undefined)).toBe(false);
  });
  it("stripPartCost removes cost_oere", () => {
    const s = stripPartCost(svc("a", 1, null, { ...inStock, cost_oere: 1234 }));
    expect(s.part).not.toHaveProperty("cost_oere");
  });
});

describe("buildServicesResponse", () => {
  const input = {
    model: { id: "m", name: "iPhone 15", brand_name: "iPhone", brand_slug: "iphone", series: "iPhone 15", image_url: null, device_type: "smartphone" },
    services: [
      { id: "a", slug: "a", name: "Skærm Budget", price_dkk: 799, quality_tier: "standard" as const, estimated_minutes: 45, warranty_info: null, service_category: "Skærmskift", part_mode: "part" as const, sort_order: 1 },
      { id: "b", slug: "b", name: "Diagnostik", price_dkk: 0, quality_tier: null, estimated_minutes: 15, warranty_info: null, service_category: "Diagnostik", part_mode: "none" as const, sort_order: 2 },
    ],
    partLinks: [{ repair_service_id: "a", sku_product_id: "sku", is_primary: true, title: "iPhone 15 Skærm", always_in_stock: false, cost_price: 30000 }],
    stock: [{ product_id: "sku", location_id: "L-V", quantity: 1, reserved_qty: 1 }],
    inTransit: { sku: 2 },
    location: "vejle" as const,
    locationIdBySlug: LOC,
  };
  it("shapes the part with reserved-aware availability and in-transit; cost only when allowed", () => {
    const withCost = buildServicesResponse({ ...input, includeCost: true });
    const part = withCost.categories[0].services[0].part!;
    expect(part).toMatchObject({ sku_product_id: "sku", tracked: true, available: 0, in_transit: 2, cost_oere: 30000 });
    expect(withCost.categories[0].services[0].quality_label).toBe("Budget");
    expect(withCost.categories[0].services[0].price_oere).toBe(79900);
    const noCost = buildServicesResponse({ ...input, includeCost: false });
    expect(noCost.categories[0].services[0].part).not.toHaveProperty("cost_oere");
  });
  it("services without a linked part have part = null", () => {
    const r = buildServicesResponse({ ...input, includeCost: false });
    const diag = r.categories.flatMap((c) => c.services).find((s) => s.id === "b")!;
    expect(diag.part).toBeNull();
    expect(diag.part_mode).toBe("none");
  });
});

describe("buildUpsellResponse", () => {
  it("lists in-stock items first and uses the sale price when lower", () => {
    const r = buildUpsellResponse({
      rows: [
        { id: "x", title: "B Cover", brand: null, category: "cover", subcategory: null, selling_price: 20000, sale_price: 15000, images: ["i.jpg"], always_in_stock: false },
        { id: "y", title: "A Glas", brand: null, category: "glas", subcategory: null, selling_price: 10000, sale_price: null, images: null, always_in_stock: false },
      ],
      stock: [{ product_id: "x", location_id: "L-V", quantity: 3, reserved_qty: 0 }],
      location: "vejle",
      locationIdBySlug: LOC,
      inTransit: {},
    });
    expect(r.items.map((i) => i.sku_product_id)).toEqual(["x", "y"]);
    expect(r.items[0].price_oere).toBe(15000);
    expect(r.items[1].available).toBe(0);
  });
});

describe("catalog helpers", () => {
  it("groups brands under their parent and models under series", () => {
    const tree = buildCatalogTree(
      [
        { id: "b1", slug: "iphone", name: "iPhone", device_type: "smartphone", logo_url: null, sort_order: 1 },
        { id: "b2", slug: "ipad", name: "iPad", device_type: "tablet", logo_url: null, sort_order: 2 },
        { id: "b3", slug: "nothing", name: "Nothing", device_type: "smartphone", logo_url: null, sort_order: 3 },
      ],
      [
        { id: "m1", brand_id: "b1", slug: "15", name: "iPhone 15", series: "iPhone 15", image_url: null, sort_order: 0 },
        { id: "m2", brand_id: "b1", slug: "16", name: "iPhone 16", series: "iPhone 16", image_url: null, sort_order: 0 },
        { id: "m3", brand_id: "b2", slug: "air", name: "iPad Air", series: null, image_url: null, sort_order: 0 },
        { id: "m4", brand_id: "b3", slug: "p1", name: "Phone 1", series: null, image_url: null, sort_order: 0 },
      ],
    );
    expect(tree.parents.map((p) => p.key)).toEqual(["apple", "nothing"]);
    expect(tree.parents[0].brands.map((b) => b.slug)).toEqual(["iphone", "ipad"]);
    expect(tree.parents[0].brands[0].series.map((s) => s.name)).toEqual(["iPhone 16", "iPhone 15"]);
    expect(tree.parents[0].brands[1].series[0].name).toBe("Øvrige");
  });
  it("sanitises search text and builds compatible-name variants", () => {
    expect(sanitizeSearch("iph,one(15)%")).toBe("iph one 15");
    expect(compatibleNameVariants("Apple iPhone 15")).toEqual(["Apple iPhone 15", "iPhone 15"]);
  });
});
