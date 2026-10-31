import { describe, expect, it } from "vitest";
import {
  buildLocalInventoryRows,
  GOOGLE_BUSINESS_PROFILE_STORE_CODES,
  serializeLocalInventory,
  type FeedLocation,
} from "../google-local-inventory";
import {
  groupDevices,
  type AccessoryRow,
  type FeedDevice,
  type FeedTemplate,
} from "../google-shopping";

const VEJLE = "loc-vejle";
const SLAGELSE = "loc-slagelse";
const WEBSHOP = "loc-webshop";
const ESBJERG = "loc-esbjerg";

const locations: FeedLocation[] = [
  { id: VEJLE, slug: "vejle" },
  { id: SLAGELSE, slug: "slagelse" },
];
const vejleCode = GOOGLE_BUSINESS_PROFILE_STORE_CODES.vejle;
const slagelseCode = GOOGLE_BUSINESS_PROFILE_STORE_CODES.slagelse;

const tpl: FeedTemplate = {
  id: "t1",
  brand: "Apple",
  category: "iphone",
  display_name: "iPhone 15",
  slug: "apple-iphone-15",
  description: null,
  short_description: "Kort",
  images: ["https://x/y.jpg"],
};
const dev = (o: Partial<FeedDevice> = {}): FeedDevice => ({
  template_id: "t1",
  grade: "B",
  storage: "128GB",
  color: "Sort",
  selling_price: 300000,
  photos: [],
  location_id: VEJLE,
  source: "internal",
  ...o,
});
const acc = (o: Partial<AccessoryRow> = {}): AccessoryRow => ({
  id: "a1",
  title: "Cover",
  slug: "cover",
  category: "accessory",
  subcategory: "cover",
  brand: "Rixus",
  selling_price: 19900,
  sale_price: null,
  images: ["https://x/a.jpg"],
  ean: null,
  product_number: null,
  description: null,
  short_description: null,
  status: "published",
  is_active: true,
  always_in_stock: false,
  ...o,
});
const groups = (devices: FeedDevice[], t: FeedTemplate = tpl) => groupDevices(devices, new Map([["t1", t]]));
const build = (o: Partial<Parameters<typeof buildLocalInventoryRows>[0]>) =>
  buildLocalInventoryRows({ locations, deviceGroups: [], accessories: [], skuStock: [], ...o });

describe("lokalt lagerfeed", () => {
  it("tæller enheder pr. butik og bruger online-id'et", () => {
    const rows = build({
      deviceGroups: groups([dev(), dev(), dev({ location_id: SLAGELSE }), dev({ location_id: WEBSHOP })]),
    });
    expect(rows.find((r) => r.store_code === vejleCode)).toMatchObject({
      id: "t1-B",
      availability: "in_stock",
      quantity: 2,
      price: "3000.00 DKK",
    });
    expect(rows.find((r) => r.store_code === slagelseCode)?.quantity).toBe(1);
  });

  it("webshop-lager giver sandt nul i butikkerne, ikke in_stock", () => {
    const rows = build({ deviceGroups: groups([dev({ location_id: WEBSHOP })]) });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.availability === "out_of_stock" && r.quantity === 0)).toBe(true);
    expect(rows[0].price).toBe("3000.00 DKK");
  });

  it("leverandørlinjer tæller aldrig som butikslager", () => {
    const rows = build({ deviceGroups: groups([dev({ source: "foxway" })]) });
    expect(rows.every((r) => r.quantity === 0)).toBe(true);
  });

  it("prisen er butikkens egen laveste pris", () => {
    const rows = build({
      deviceGroups: groups([
        dev({ selling_price: 280000, location_id: WEBSHOP }),
        dev({ selling_price: 320000 }),
        dev({ selling_price: 310000 }),
      ]),
    });
    expect(rows.find((r) => r.store_code === vejleCode)?.price).toBe("3100.00 DKK");
    expect(rows.find((r) => r.store_code === slagelseCode)?.price).toBe("2800.00 DKK");
  });

  it("id'er følger variantopdelingen", () => {
    const t = { ...tpl, default_attributes: { gtins_by_variant: { "256GB|Blå": "0195949036606" } } };
    const deviceGroups = groups([dev(), dev({ storage: "256GB", color: "Blå", selling_price: 350000 })], t);
    const rows = build({ deviceGroups }).filter((r) => r.store_code === vejleCode);
    expect(rows.map((r) => r.id).sort()).toEqual(deviceGroups.map((g) => g.id).sort());
    expect(rows.find((r) => r.id === "t1-B")?.quantity).toBe(1);
  });

  it("tilbehør bruger lageret for butikken, ikke summen, og udsalgsprisen", () => {
    const rows = build({
      accessories: [acc({ sale_price: 14900 })],
      skuStock: [
        { product_id: "a1", location_id: VEJLE, quantity: 3 },
        { product_id: "a1", location_id: WEBSHOP, quantity: 40 },
      ],
    });
    expect(rows.find((r) => r.store_code === vejleCode)).toMatchObject({
      id: "a1",
      quantity: 3,
      availability: "in_stock",
      price: "199.00 DKK",
      sale_price: "149.00 DKK",
    });
    expect(rows.find((r) => r.store_code === slagelseCode)).toMatchObject({
      quantity: 0,
      availability: "out_of_stock",
    });
  });

  it("always_in_stock gør ikke varen til butikslager", () => {
    const rows = build({ accessories: [acc({ always_in_stock: true })] });
    expect(rows.every((r) => r.availability === "out_of_stock")).toBe(true);
  });

  it("varer, der ikke findes i online-feedet, kommer ikke med", () => {
    const rows = build({
      accessories: [acc({ images: [] }), acc({ id: "a2", slug: null })],
      deviceGroups: groups([dev()], { ...tpl, images: [] }),
    });
    expect(rows).toHaveLength(0);
  });

  it("kun kendte butikker kommer med: aldrig Esbjerg, webshop eller ukendte", () => {
    const rows = buildLocalInventoryRows({
      locations: [
        ...locations,
        { id: ESBJERG, slug: "esbjerg" },
        { id: WEBSHOP, slug: "webshop" },
        { id: "x", slug: null },
      ],
      deviceGroups: groups([dev({ location_id: ESBJERG })]),
      accessories: [acc()],
      skuStock: [{ product_id: "a1", location_id: ESBJERG, quantity: 5 }],
    });
    expect(new Set(rows.map((r) => r.store_code))).toEqual(new Set([vejleCode, slagelseCode]));
    expect(serializeLocalInventory(rows).toLowerCase()).not.toContain("esbjerg");
    expect(rows.every((r) => r.quantity === 0)).toBe(true);
  });

  it("serialiserer som TSV med kolonnerække", () => {
    const tsv = serializeLocalInventory(build({ deviceGroups: groups([dev()]) }));
    const lines = tsv.trimEnd().split("\n");
    expect(lines[0]).toBe("store_code\tid\tavailability\tquantity\tprice\tsale_price");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(`${vejleCode}\tt1-B\tin_stock\t1\t3000.00 DKK\t`);
  });
});
