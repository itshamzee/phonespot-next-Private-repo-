import { describe, it, expect } from "vitest";
import {
  accessoryDescription,
  accessoryUrl,
  buildAccessoryItem,
  buildDeviceItem,
  dedupeAccessoryTitles,
  deviceDescription,
  deviceTitle,
  deviceUrl,
  groupDevices,
  shippingLines,
  validSalePrice,
  type AccessoryRow,
  type FeedDevice,
  type FeedTemplate,
} from "../google-shopping";
import { accessoryAvailability } from "../../accessory-availability";
import { accessoryProductPath } from "../../tilbehoer-config";
import { effectiveGrade } from "../../grades";
import { devicesToItemCondition, ITEM_CONDITION } from "../../seo/item-condition";

const tpl: FeedTemplate = {
  id: "t1",
  brand: "Apple",
  category: "iphone",
  display_name: "iPhone 14 Pro",
  slug: "iphone-14-pro",
  description: null,
  short_description: "",
  images: ["https://x/y.jpg"],
};
const dev = (o: Partial<FeedDevice> = {}): FeedDevice => ({
  template_id: "t1",
  grade: "A",
  storage: "128GB",
  color: "Sort",
  selling_price: 500000,
  photos: [],
  condition_notes: null,
  ...o,
});
const acc = (o: Partial<AccessoryRow> = {}): AccessoryRow => ({
  id: "a1",
  title: "Beskyttelsesglas iPhone 15",
  slug: "glas-15",
  category: "accessory",
  subcategory: "screen_protector",
  brand: "Swissten",
  selling_price: 9900,
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

describe("accessory URLs", () => {
  it("screen_protector linker til beskyttelsesglas, ikke skaermbeskyttelse (som sitemap)", () => {
    expect(accessoryUrl(acc())).toBe("https://phonespot.dk/tilbehoer/beskyttelsesglas/glas-15");
    expect(accessoryUrl(acc({ subcategory: "spot-glass" }))).toContain("/beskyttelsesglas/");
  });
  it("matcher sitemap-funktionen for alle underkategorier", () => {
    for (const sub of ["cover", "screen_protector", "spot-glass", "charger", "cable", "audio", "other", null]) {
      const p = { subcategory: sub, category: "accessory", slug: "x" };
      expect(accessoryUrl(p)).toBe(`https://phonespot.dk${accessoryProductPath(p)}`);
    }
  });
});

describe("accessoryAvailability", () => {
  it("lager > 0 giver in_stock", () => {
    expect(accessoryAvailability(3, false).feed).toBe("in_stock");
    expect(accessoryAvailability(3, true).label).toBe("På lager");
  });
  it("lager 0 + always_in_stock giver in_stock og InStock (ikke BackOrder)", () => {
    const a = accessoryAvailability(0, true);
    expect(a.feed).toBe("in_stock");
    expect(a.schema).toBe("https://schema.org/InStock");
    expect(a.label).toBe("På lager hos leverandør – sendes 1–3 hverdage");
    expect(a.canBuy).toBe(true);
  });
  it("lager 0 uden always_in_stock giver out_of_stock", () => {
    const a = accessoryAvailability(0, false);
    expect(a.feed).toBe("out_of_stock");
    expect(a.schema).toBe("https://schema.org/OutOfStock");
    expect(a.canBuy).toBe(false);
  });
  it("ukendt lager er out_of_stock i feedet uden always_in_stock", () => {
    expect(accessoryAvailability(null, false).feed).toBe("out_of_stock");
    expect(accessoryAvailability(null, false).schema).toBeUndefined();
  });
  it("feedet bruger availability fra hjælperen", () => {
    expect(buildAccessoryItem(acc({ always_in_stock: true }), 0)).toContain("<g:availability>in_stock<");
    expect(buildAccessoryItem(acc(), 0)).toContain("<g:availability>out_of_stock<");
  });
});

describe("sale_price", () => {
  it("kun når strengt lavere end price", () => {
    expect(validSalePrice(1000, 800)).toBe(800);
    expect(validSalePrice(1000, 1000)).toBeNull();
    expect(validSalePrice(1000, 1200)).toBeNull();
    expect(validSalePrice(1000, 0)).toBeNull();
    expect(validSalePrice(1000, null)).toBeNull();
  });
  it("udelades i XML ved lig pris", () => {
    expect(buildAccessoryItem(acc({ sale_price: 9900 }), 1)).not.toContain("sale_price");
    expect(buildAccessoryItem(acc({ sale_price: 7900 }), 1)).toContain("<g:sale_price>79.00 DKK<");
  });
});

describe("beskrivelser", () => {
  it("tilbehør: description før kort short_description", () => {
    expect(
      accessoryDescription(acc({ short_description: "Kort", description: "Lang beskrivelse af produktet" })),
    ).toBe("Lang beskrivelse af produktet");
  });
  it("tilbehør: lang short_description bevares", () => {
    const short = "x".repeat(60);
    expect(accessoryDescription(acc({ short_description: short, description: "andet" }))).toBe(short);
  });
  it("tilbehør: falder tilbage til titel", () => {
    expect(accessoryDescription(acc({ short_description: " ", description: "" }))).toBe(
      "Beskyttelsesglas iPhone 15",
    );
  });
  it("enhed: tom short_description falder tilbage på description, derefter genereret tekst", () => {
    const g = groupDevices([dev()], new Map([["t1", { ...tpl, short_description: "", description: "Fra description" }]]))[0];
    expect(deviceDescription(g, deviceTitle(g))).toBe("Fra description");
    const g2 = groupDevices([dev()], new Map([["t1", { ...tpl, short_description: "  ", description: null }]]))[0];
    const d = deviceDescription(g2, deviceTitle(g2));
    expect(d).toContain("iPhone 14 Pro");
    expect(d).toContain("36 mdr. garanti");
  });
  it("tilbehørsfeed nævner ikke 36 mdr.", () => {
    expect(buildAccessoryItem(acc(), 1)).not.toContain("36 mdr");
  });
});

describe("identifikatorer", () => {
  it("enheder sender identifier_exists=no", () => {
    const g = groupDevices([dev()], new Map([["t1", tpl]]))[0];
    expect(buildDeviceItem(g)).toContain("<g:identifier_exists>no<");
  });
  it("tilbehør med gtin sender gtin, uden gtin/mpn identifier_exists=no", () => {
    expect(buildAccessoryItem(acc({ ean: "5901234123457" }), 1)).toContain("<g:gtin>5901234123457<");
    expect(buildAccessoryItem(acc({ ean: "5901234123457" }), 1)).not.toContain("identifier_exists");
    expect(buildAccessoryItem(acc(), 1)).toContain("identifier_exists>no");
    expect(buildAccessoryItem(acc({ product_number: "SW-1" }), 1)).toContain("<g:mpn>SW-1<");
  });
});

describe("enhedstitler, grupper og links", () => {
  it("beskrivende titel med brand, lager, farve og læsbar stand", () => {
    const g = groupDevices([dev()], new Map([["t1", tpl]]))[0];
    expect(deviceTitle(g)).toBe("Apple iPhone 14 Pro 128GB Sort - Refurbished, Som ny");
  });
  it("udelader lager/farve ved blandede værdier og viser aldrig Grade P", () => {
    const g = groupDevices(
      [dev({ grade: "P", storage: "128GB" }), dev({ grade: "P", storage: "256GB", color: "Guld" })],
      new Map([["t1", tpl]]),
    )[0];
    const t = deviceTitle(g);
    expect(t).toBe("Apple iPhone 14 Pro - Refurbished, Premiumstand");
    expect(t).not.toMatch(/Grade P/);
  });
  it("fabriksny titel siger ikke refurbished", () => {
    const g = groupDevices([dev({ grade: "N" })], new Map([["t1", tpl]]))[0];
    expect(deviceTitle(g)).not.toMatch(/Refurbished/);
    expect(buildDeviceItem(g)).toContain("<g:condition>new<");
  });
  it("laveste pris pr. stand og link med ?grade=", () => {
    const groups = groupDevices(
      [dev({ selling_price: 600000 }), dev({ selling_price: 500000 }), dev({ grade: "B", selling_price: 400000 })],
      new Map([["t1", tpl]]),
    );
    expect(groups).toHaveLength(2);
    const a = groups.find((x) => x.grade === "A")!;
    expect(a.minPrice).toBe(500000);
    expect(deviceUrl(a)).toBe("https://phonespot.dk/refurbished/iphone-14-pro?grade=A");
    expect(buildDeviceItem(a)).toContain("<g:link>https://phonespot.dk/refurbished/iphone-14-pro?grade=A<");
  });
  it("grade A med fabriksny i noter behandles som N (som siden)", () => {
    expect(effectiveGrade({ grade: "A", condition_notes: "Fabriksny, åbnet" })).toBe("N");
    const g = groupDevices([dev({ condition_notes: "Fabriksny" })], new Map([["t1", tpl]]))[0];
    expect(g.grade).toBe("N");
    expect(buildDeviceItem(g)).toContain("<g:condition>new<");
  });
  it("JSON-LD itemCondition: fabriksnye via noter er NewCondition", () => {
    expect(devicesToItemCondition([{ grade: "A", condition_notes: "fabriksny" }])).toBe(ITEM_CONDITION.NEW);
    expect(devicesToItemCondition([{ grade: "A" }])).toBe(ITEM_CONDITION.REFURBISHED);
  });
});

describe("fragt", () => {
  it("pakkeshop er altid 0, dør 39 kr under 500 kr og gratis derover", () => {
    const low = shippingLines(9900).join("\n");
    expect(low).toContain("<g:service>Pakkeshop</g:service>\n        <g:price>0.00 DKK");
    expect(low).toContain("<g:service>Levering til døren</g:service>\n        <g:price>39.00 DKK");
    expect(shippingLines(50000).join("\n")).toContain("Levering til døren</g:service>\n        <g:price>0.00 DKK");
  });
});

describe("titel-dedupe", () => {
  it("tilføjer farve ved ens titler", () => {
    const rows = [
      acc({ id: "1", attributes: { color: "Sort" } }),
      acc({ id: "2", attributes: { color: "Hvid" } }),
      acc({ id: "3", title: "Unik" }),
    ];
    const m = dedupeAccessoryTitles(rows);
    expect(m.get("1")).toBe("Beskyttelsesglas iPhone 15 - Sort");
    expect(m.get("2")).toBe("Beskyttelsesglas iPhone 15 - Hvid");
    expect(m.get("3")).toBe("Unik");
  });
});
