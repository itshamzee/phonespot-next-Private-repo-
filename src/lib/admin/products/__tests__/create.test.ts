import { describe, expect, it } from "vitest";
import {
  buildAccessoryRows,
  buildSparePartRow,
  expandTitle,
  resolveStockRows,
  uniqueSlugs,
  validateCompatibleModels,
  type LocationRow,
} from "../create";

const locations: LocationRow[] = [
  { id: "online", name: "Online", type: "online" },
  { id: "slagelse", name: "Slagelse", type: "store" },
  { id: "vejle", name: "Vejle", type: "store" },
];

describe("expandTitle", () => {
  it("indsætter modellens label for {model}", () => {
    expect(expandTitle("Swissten Clear Cover {model}", "iphone-17-pro")).toBe(
      "Swissten Clear Cover iPhone 17 Pro",
    );
  });
  it("lader titlen være uden {model}", () => {
    expect(expandTitle("USB-C kabel 2m", "iphone-17-pro")).toBe("USB-C kabel 2m");
  });
});

describe("validateCompatibleModels", () => {
  it("accepterer kendte slugs og afviser ukendte", () => {
    expect(validateCompatibleModels(["iphone-17-pro", "iphone-17"])).toEqual({ ok: ["iphone-17-pro", "iphone-17"], unknown: [] });
    expect(validateCompatibleModels(["iphone-99"])).toEqual({ ok: [], unknown: ["iphone-99"] });
  });
});

describe("buildAccessoryRows", () => {
  const base = {
    title: "Swissten Clear Cover {model}",
    subcategory: "cover",
    brand: "Swissten",
    models: ["iphone-17-pro", "iphone-17"],
    sellingPrice: 19900,
    images: ["https://cdn/x.jpg"],
    attributes: { case_type: "Clear" },
  };

  it("opretter én række pr. model med kompatible modeller, published og aktiv", () => {
    const rows = buildAccessoryRows({ ...base, mode: "per-model" });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: "Swissten Clear Cover iPhone 17 Pro",
      slug: "swissten-clear-cover-iphone-17-pro",
      category: "accessory",
      subcategory: "cover",
      brand: "Swissten",
      compatible_models: ["iphone-17-pro"],
      attributes: { case_type: "Clear" },
      selling_price: 19900,
      status: "published",
      is_active: true,
      images: ["https://cdn/x.jpg"],
    });
    expect(rows[1].compatible_models).toEqual(["iphone-17"]);
  });

  it("opretter én række med alle modeller i universal-tilstand", () => {
    const rows = buildAccessoryRows({ ...base, title: "USB-C kabel 2m", mode: "universal" });
    expect(rows).toHaveLength(1);
    expect(rows[0].compatible_models).toEqual(["iphone-17-pro", "iphone-17"]);
    expect(rows[0].slug).toBe("usb-c-kabel-2m");
  });

  it("afviser ukendte attributter for kategorien", () => {
    expect(() =>
      buildAccessoryRows({ ...base, mode: "universal", attributes: { watt: "20" } }),
    ).toThrow(/watt/);
  });

  it("normaliserer tomme valgfrie felter til null og øre til heltal", () => {
    const [row] = buildAccessoryRows({
      ...base,
      mode: "universal",
      salePrice: 0,
      costPrice: undefined,
      ean: " ",
      description: "",
    });
    expect(row.sale_price).toBeNull();
    expect(row.cost_price).toBeNull();
    expect(row.ean).toBeNull();
    expect(row.description).toBeNull();
  });

  it("kan gemmes som kladde", () => {
    const [row] = buildAccessoryRows({ ...base, mode: "universal", status: "draft" });
    expect(row.status).toBe("draft");
    expect(row.is_active).toBe(true);
  });
});

describe("buildSparePartRow", () => {
  it("sætter både category og subcategory til spare-part", () => {
    const row = buildSparePartRow({
      title: "iPhone 13 skærm",
      sellingPrice: 89900,
      partCategoryId: "cat-1",
      qualityTierId: "tier-1",
      deviceBrand: "Apple",
      deviceModel: "iPhone 13",
      images: [],
    });
    expect(row).toMatchObject({
      category: "spare-part",
      subcategory: "spare-part",
      part_category_id: "cat-1",
      quality_tier_id: "tier-1",
      device_brand: "Apple",
      device_model: "iPhone 13",
      slug: "iphone-13-skaerm",
      status: "published",
      is_active: true,
    });
  });
});

describe("resolveStockRows", () => {
  it("mapper online til online-lokationen og butikker på navn", () => {
    expect(resolveStockRows(locations, { online: 5, stores: { vejle: 2 } })).toEqual([
      { location_id: "online", quantity: 5 },
      { location_id: "vejle", quantity: 2 },
    ]);
  });
  it("springer nul og ukendte butikker over", () => {
    expect(resolveStockRows(locations, { online: 0, stores: { odense: 3 } })).toEqual([]);
  });
});

describe("uniqueSlugs", () => {
  it("giver løbenummer når slug allerede findes", () => {
    expect(uniqueSlugs(["cover-a", "cover-b", "cover-a"], new Set(["cover-b", "cover-b-2"]))).toEqual([
      "cover-a",
      "cover-b-3",
      "cover-a-2",
    ]);
  });
});
