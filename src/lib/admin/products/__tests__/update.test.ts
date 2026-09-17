import { describe, expect, it } from "vitest";
import { buildAccessoryUpdate, planTemplateLinks, stockUpserts, modelsForProduct, type ExistingProduct } from "../update";
import type { LocationRow } from "../create";

const existing: ExistingProduct = {
  id: "p1",
  category: "accessory",
  subcategory: "cover",
  slug: "rixus-duo",
  attributes: { case_type: "Wallet", material: "PU-læder og TPU", card_slots: "4 kort" },
  specifications: { highlights: ["gammel"], note: "bevares" },
};

const input = {
  title: "  Rixus Duo pungcover  ",
  subcategory: "cover",
  brand: " Rixus ",
  models: ["iphone-17-pro-max", "iphone-18-pro-max"],
  sellingPrice: 49900,
  salePrice: 34900,
  costPrice: null,
  ean: "",
  images: ["a.png", ""],
  description: "Tekst",
  shortDescription: "Kort",
  highlights: ["Aftageligt cover: tag det ud", " "],
  attributes: { case_type: "Slim" },
  alwaysInStock: true,
  status: "published" as const,
  metaTitle: "Titel | PhoneSpot",
  metaDescription: "",
};

describe("buildAccessoryUpdate", () => {
  it("trimmer felter, gemmer modeller og lader slug være i fred", () => {
    const row = buildAccessoryUpdate(existing, input);
    expect(row).toMatchObject({
      title: "Rixus Duo pungcover",
      brand: "Rixus",
      compatible_models: ["iphone-17-pro-max", "iphone-18-pro-max"],
      selling_price: 49900,
      sale_price: 34900,
      cost_price: null,
      ean: null,
      images: ["a.png"],
      short_description: "Kort",
      always_in_stock: true,
      status: "published",
      meta_title: "Titel | PhoneSpot",
      meta_description: null,
    });
    expect(row).not.toHaveProperty("slug");
  });

  it("bevarer frie attributter og andre specifikationer, men opdaterer de kendte", () => {
    const row = buildAccessoryUpdate(existing, input);
    expect(row.attributes).toEqual({ case_type: "Slim", material: "PU-læder og TPU", card_slots: "4 kort" });
    expect(row.specifications).toEqual({ highlights: ["Aftageligt cover: tag det ud"], note: "bevares" });
  });

  it("fjerner en kendt attribut, når feltet tømmes", () => {
    const row = buildAccessoryUpdate(existing, { ...input, attributes: { case_type: "" } });
    expect(row.attributes).toEqual({ material: "PU-læder og TPU", card_slots: "4 kort" });
  });

  it("nulstiller attributter fra den gamle kategori ved kategoriskift", () => {
    const row = buildAccessoryUpdate(existing, { ...input, subcategory: "cable", attributes: { connector_type: "USB-C" } });
    expect(row.attributes).toEqual({ connector_type: "USB-C", material: "PU-læder og TPU", card_slots: "4 kort" });
  });

  it("laver et slug, hvis produktet ingen har", () => {
    const row = buildAccessoryUpdate({ ...existing, slug: null }, input);
    expect(row.slug).toBe("rixus-duo-pungcover");
  });

  it("afviser ugyldige værdier med dansk fejl", () => {
    expect(() => buildAccessoryUpdate(existing, { ...input, attributes: { case_type: "Ukendt" } })).toThrow(/gyldig værdi/);
    expect(() => buildAccessoryUpdate(existing, { ...input, models: ["nokia-3310"] })).toThrow(/Ukendte modeller/);
    expect(() => buildAccessoryUpdate(existing, { ...input, sellingPrice: 0 })).toThrow(/Salgspris/);
    expect(() => buildAccessoryUpdate(existing, { ...input, title: " " })).toThrow(/Titel/);
    expect(() => buildAccessoryUpdate({ ...existing, category: "spare-part" }, input)).toThrow(/tilbehør/i);
  });

  it("tilbudspris skal være lavere end salgsprisen", () => {
    expect(() => buildAccessoryUpdate(existing, { ...input, salePrice: 59900 })).toThrow(/Tilbudspris/);
  });

  it("rører ikke attributter for kategorier formularen ikke kender (spot-glass)", () => {
    const spot = { ...existing, subcategory: "spot-glass", attributes: { finish: "privacy" } };
    const row = buildAccessoryUpdate(spot, { ...input, subcategory: "spot-glass", attributes: {} });
    expect(row.attributes).toEqual({ finish: "privacy" });
    expect(row.subcategory).toBe("spot-glass");
  });
});

describe("planTemplateLinks", () => {
  const templates = [
    { id: "t17", display_name: "Apple iPhone 17 Pro Max" },
    { id: "t18", display_name: "Apple iPhone 18 Pro Max" },
    { id: "t16e", display_name: "Apple iPhone 16e" },
    { id: "t17e", display_name: "Apple iPhone 17e" },
  ];

  it("tilføjer koblinger for valgte modeller og fjerner fravalgte", () => {
    const plan = planTemplateLinks(
      [{ template_id: "t17", display_name: "Apple iPhone 17 Pro Max" }, { template_id: "tX", display_name: "Apple iPhone 15" }],
      ["iphone-17-pro-max", "iphone-18-pro-max"],
      templates,
    );
    expect(plan.add).toEqual(["t18"]);
    expect(plan.remove).toEqual(["tX"]);
  });

  it("bevarer koblinger til skabeloner, modelvælgeren ikke kender", () => {
    const plan = planTemplateLinks([{ template_id: "tPad", display_name: "Lenovo Tab M10" }], [], templates);
    expect(plan).toEqual({ add: [], remove: [] });
  });

  it("en kombineret model (17e/16e) kobler begge skabeloner", () => {
    const plan = planTemplateLinks([], ["iphone-17e"], templates);
    expect(plan.add.sort()).toEqual(["t16e", "t17e"]);
  });
});

describe("modelsForProduct", () => {
  it("samler compatible_models og skabelon-koblinger til slugs uden dubletter", () => {
    expect(
      modelsForProduct(["iphone-17-pro-max"], ["Apple iPhone 17 Pro Max", "Apple iPhone 18 Pro Max", "Lenovo Tab M10"]),
    ).toEqual(["iphone-17-pro-max", "iphone-18-pro-max"]);
  });
});

describe("stockUpserts", () => {
  const locations: LocationRow[] = [
    { id: "online", name: "Online", type: "online" },
    { id: "slagelse", name: "Slagelse", type: "store" },
    { id: "vejle", name: "Vejle", type: "store" },
  ];
  it("skriver også nuller, så lager kan sættes ned til 0", () => {
    expect(stockUpserts(locations, { online: 0, stores: { vejle: 3, slagelse: 0 } })).toEqual([
      { location_id: "online", quantity: 0 },
      { location_id: "vejle", quantity: 3 },
      { location_id: "slagelse", quantity: 0 },
    ]);
  });
  it("springer felter over, der ikke er sendt med", () => {
    expect(stockUpserts(locations, { stores: { vejle: 2 } })).toEqual([{ location_id: "vejle", quantity: 2 }]);
  });
});
