import { describe, expect, it } from "vitest";
import { isSparePart, withoutSpareParts } from "@/lib/spare-part-filter";

describe("isSparePart", () => {
  it("matches subcategory or category spare-part", () => {
    expect(isSparePart({ category: "accessory", subcategory: "spare-part" })).toBe(true);
    expect(isSparePart({ category: "spare-part", subcategory: null })).toBe(true);
  });
  it("keeps accessories, including rows with no subcategory", () => {
    expect(isSparePart({ category: "accessory", subcategory: null })).toBe(false);
    expect(isSparePart({ category: null, subcategory: null })).toBe(false);
    expect(isSparePart({ category: "accessory", subcategory: "cover" })).toBe(false);
    expect(isSparePart({})).toBe(false);
  });
  it("withoutSpareParts keeps order and drops only spare parts", () => {
    const rows = [
      { id: "a", category: "accessory", subcategory: null },
      { id: "b", category: "accessory", subcategory: "spare-part" },
      { id: "c", category: "spare-part", subcategory: null },
      { id: "d", category: "accessory", subcategory: "cable" },
    ];
    expect(withoutSpareParts(rows).map((r) => r.id)).toEqual(["a", "d"]);
  });
});
