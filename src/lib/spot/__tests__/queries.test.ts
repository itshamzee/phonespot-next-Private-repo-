import { describe, it, expect } from "vitest";
import { groupByVariantGroup, findVariantGroupForModel } from "../queries";
import type { SpotSku } from "../types";

const rows: SpotSku[] = [
  { id: "1", title: "Spot Glass — iPhone 13/14/15",   variant_group: "g1", variant_label: "Normal",  variant_sort: 1, selling_price: 19900, sale_price: null, compatible_models: ["iphone-13","iphone-14","iphone-15"], images: [], slug: "s1", subcategory: "spot-glass", is_active: true },
  { id: "2", title: "Spot Privacy — iPhone 13/14/15", variant_group: "g1", variant_label: "Privacy", variant_sort: 2, selling_price: 24900, sale_price: null, compatible_models: ["iphone-13","iphone-14","iphone-15"], images: [], slug: "s2", subcategory: "spot-glass", is_active: true },
  { id: "3", title: "Spot Glass — iPhone 16 Pro",     variant_group: "g2", variant_label: "Normal",  variant_sort: 1, selling_price: 19900, sale_price: null, compatible_models: ["iphone-16-pro"],                     images: [], slug: "s3", subcategory: "spot-glass", is_active: true },
];

describe("groupByVariantGroup", () => {
  it("groups SKUs by variant_group and sorts each group by variant_sort", () => {
    const out = groupByVariantGroup(rows);
    expect(out.size).toBe(2);
    expect(out.get("g1")!.map(r => r.variant_label)).toEqual(["Normal","Privacy"]);
    expect(out.get("g2")!.map(r => r.variant_label)).toEqual(["Normal"]);
  });

  it("skips rows with null variant_group", () => {
    const withNull: SpotSku[] = [...rows, { ...rows[0], id: "x", variant_group: null }];
    const out = groupByVariantGroup(withNull);
    expect(out.size).toBe(2);
  });
});

describe("findVariantGroupForModel", () => {
  it("returns the variant_group that contains the model", () => {
    expect(findVariantGroupForModel(rows, "iphone-14")).toBe("g1");
    expect(findVariantGroupForModel(rows, "iphone-16-pro")).toBe("g2");
  });

  it("returns null when no SKU matches the model", () => {
    expect(findVariantGroupForModel(rows, "iphone-5")).toBeNull();
  });
});
