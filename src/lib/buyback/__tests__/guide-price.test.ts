import { describe, expect, it } from "vitest";
import {
  GUIDE_PRICE,
  baseFromListings,
  computeGuidePrice,
  effectiveFactor,
  guideFamily,
  normalizeModelName,
  storageGb,
} from "../guide-price";
import { estimateGuidePrice, guidePriceTable, type GuideListing } from "../guide-price-server";
import { DEFAULT_BUYBACK_SETTINGS } from "../settings";
import type { BuybackCondition, BuybackDevice } from "../types";

const kr = (value: number) => value * 100;

describe("computeGuidePrice", () => {
  it("giver de priser, ejeren godkendte 13/11-2026 (faktor 0,70, fin stand)", () => {
    const price = (baseDkk: number) => {
      const result = computeGuidePrice({ baseOre: kr(baseDkk), partPricesOre: [], factor: 0.7 });
      return result.status === "priced" ? result.amountOre / 100 : null;
    };
    expect(price(2399)).toBe(1200); // iPhone 13 128 GB
    expect(price(3799)).toBe(2100); // iPhone 15 128 GB
    expect(price(4799)).toBe(2700); // iPhone 15 Pro 256 GB
  });

  it("runder ned til 50 kr. og regner fortjenesten efter brugtmoms", () => {
    const result = computeGuidePrice({ baseOre: kr(2399), partPricesOre: [], factor: 0.7 });
    expect(result.status).toBe("priced");
    if (result.status !== "priced") return;
    expect(result.amountOre % 5000).toBe(0);
    // 0,7125 x 2.399 - 250 - 50 - 0,8 x 1.200 = 449 kr.
    expect(Math.round(result.marginOre / 100)).toBe(449);
  });

  it("trækker reservedel og arbejdsløn fra for hver fejl", () => {
    const fine = computeGuidePrice({ baseOre: kr(3799), partPricesOre: [], factor: 0.7 });
    const cracked = computeGuidePrice({ baseOre: kr(3799), partPricesOre: [kr(600)], factor: 0.7 });
    expect(fine.status).toBe("priced");
    expect(cracked.status).toBe("priced");
    if (fine.status !== "priced" || cracked.status !== "priced") return;
    // (600 + 150) / 0,8 x 0,7 = 656 kr. lavere, før afrunding.
    expect(fine.amountOre - cracked.amountOre).toBeGreaterThanOrEqual(kr(650));
    expect(fine.amountOre - cracked.amountOre).toBeLessThanOrEqual(kr(700));
  });

  it("viser ingen pris, når buddet eller fortjenesten bliver for lille", () => {
    expect(computeGuidePrice({ baseOre: kr(900), partPricesOre: [], factor: 0.7 }).status).toBe("none");
    expect(computeGuidePrice({ baseOre: kr(2399), partPricesOre: [kr(1200)], factor: 0.7 }).status).toBe("none");
  });

  it("viser ingen pris over loftet og afviser en ugyldig faktor", () => {
    expect(computeGuidePrice({ baseOre: kr(14999), partPricesOre: [], factor: 0.7 }).status).toBe("none");
    expect(computeGuidePrice({ baseOre: kr(2399), partPricesOre: [], factor: 1.2 }).status).toBe("none");
    expect(computeGuidePrice({ baseOre: kr(2399), partPricesOre: [], factor: 0 }).status).toBe("none");
  });

  it("taber aldrig penge: fortjenesten er mindst minimum for alle salgspriser", () => {
    for (let base = 1000; base <= 9000; base += 137) {
      const result = computeGuidePrice({ baseOre: kr(base), partPricesOre: [], factor: 0.8 });
      if (result.status === "priced") expect(result.marginOre).toBeGreaterThanOrEqual(GUIDE_PRICE.minMarginOre);
    }
  });
});

describe("modeller og lagerplads", () => {
  it("tager kun iPhone 12 til 17 med", () => {
    expect(guideFamily("iPhone 13 mini")).toBe(13);
    expect(guideFamily("iPhone 16e")).toBe(16);
    expect(guideFamily("iPhone Air")).toBe(17);
    expect(guideFamily("Iphone 15 pro ")).toBe(15);
    for (const model of ["iPhone 11", "iPhone 18 Pro", "iPhone Duo", "iPhone SE (3. gen)", "iPhone XS", "Galaxy S24", ""]) {
      expect(guideFamily(model), model).toBeNull();
    }
  });

  it("matcher formularens navne med katalogets", () => {
    expect(normalizeModelName("iPhone 13 mini")).toBe(normalizeModelName("iPhone 13 Mini"));
    expect(normalizeModelName("iPhone Air")).toBe(normalizeModelName("iPhone 17 Air"));
  });

  it("læser lagerplads", () => {
    expect(storageGb("128GB")).toBe(128);
    expect(storageGb("1TB")).toBe(1024);
    expect(storageGb("")).toBeNull();
  });

  it("giver nye modeller en lavere faktor", () => {
    expect(effectiveFactor(17, 0.7)).toBe(0.65);
    expect(effectiveFactor(17, 0.6)).toBe(0.6);
    expect(effectiveFactor(16, 0.7)).toBe(0.7);
  });
});

describe("baseFromListings", () => {
  const listings = [
    ...Array.from({ length: 5 }, () => ({ storageGb: 128, priceOre: kr(2399) })),
    ...Array.from({ length: 3 }, () => ({ storageGb: 256, priceOre: kr(2699) })),
    { storageGb: 512, priceOre: kr(3299) }, // kun én enhed: tæller ikke
  ];

  it("bruger medianen for samme lagerplads", () => {
    expect(baseFromListings(listings, 128)).toMatchObject({ baseOre: kr(2399), source: "exact", dataPoints: 5 });
  });

  it("falder tilbage til mindre lagerplads uden tillæg", () => {
    expect(baseFromListings(listings, 512)).toMatchObject({ baseOre: kr(2699), source: "smaller-storage", fromGb: 256 });
  });

  it("trækker et fast beløb pr. lagertrin, når kun en større størrelse har data", () => {
    expect(baseFromListings(listings, 64)).toMatchObject({ baseOre: kr(2399) - GUIDE_PRICE.storageStepOre, source: "larger-storage" });
  });

  it("giver intet uden nok data", () => {
    expect(baseFromListings([{ storageGb: 128, priceOre: kr(2399) }], 128)).toBeNull();
    expect(baseFromListings([], 128)).toBeNull();
  });
});

describe("estimateGuidePrice", () => {
  const listings: GuideListing[] = Array.from({ length: 5 }, () => ({
    model: "iphone 13",
    catalogModel: "iPhone 13",
    storageGb: 128,
    priceOre: kr(2399),
  }));
  const device: BuybackDevice = {
    deviceType: "Telefon", brand: "Apple", model: "iPhone 13", storage: "128GB", ram: "",
    useCustom: false, brandCustom: "", modelCustom: "",
  };
  const fine: BuybackCondition = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };
  const on = { ...DEFAULT_BUYBACK_SETTINGS, publicPriceEnabled: true };
  // Ingen fejl i de fleste tests, så reservedelsopslaget må aldrig blive kaldt.
  const noDb = {} as Parameters<typeof estimateGuidePrice>[0];

  it("er slået fra som standard", async () => {
    expect(DEFAULT_BUYBACK_SETTINGS.publicPriceEnabled).toBe(false);
    expect(await estimateGuidePrice(noDb, device, fine, DEFAULT_BUYBACK_SETTINGS, { listings, references: [] })).toMatchObject({ status: "none" });
  });

  it("giver 1.200 kr. for en iPhone 13 128 GB i fin stand, når den er slået til", async () => {
    expect(await estimateGuidePrice(noDb, device, fine, on, { listings, references: [] })).toMatchObject({ status: "priced", amountOre: kr(1200) });
  });

  it("viser ingen pris for låste, døde eller ukendte enheder og fejl uden delpris", async () => {
    const cases: [Partial<BuybackDevice>, Partial<BuybackCondition>][] = [
      [{}, { cloudLocked: "Ja" }],
      [{}, { screen: "Virker ikke" }],
      [{}, { allWorking: "Nej", brokenParts: ["Face ID"] }],
      [{}, { allWorking: "Nej", brokenParts: ["Tænder ikke"] }],
      [{ model: "iPhone 11" }, {}],
      [{ model: "iPhone 18 Pro" }, {}],
      [{ brand: "Samsung", model: "Galaxy S24" }, {}],
      [{ deviceType: "Tablet", model: "iPad Air" }, {}],
      [{ useCustom: true }, {}],
      [{ storage: "" }, {}],
      [{ model: "iPhone 14" }, {}], // ingen listede enheder
    ];
    for (const [d, c] of cases) {
      const result = await estimateGuidePrice(noDb, { ...device, ...d }, { ...fine, ...c }, on, { listings, references: [] });
      expect(result.status, JSON.stringify([d, c])).toBe("none");
    }
  });
});

describe("guidePriceTable", () => {
  it("lister kun modeller i første runde og sorterer dem", () => {
    const row = (model: string, catalogModel: string, gb: number, price: number): GuideListing[] =>
      Array.from({ length: 3 }, () => ({ model, catalogModel, storageGb: gb, priceOre: kr(price) }));
    const rows = guidePriceTable(
      [...row("iphone 15", "iPhone 15", 128, 3799), ...row("iphone 13", "iPhone 13", 128, 2399), ...row("iphone 11", "iPhone 11", 64, 1399)],
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(rows.map((r) => r.model)).not.toContain("iPhone 11");
    expect(rows[0].model).toBe("iPhone 13");
    expect(rows.find((r) => r.model === "iPhone 13" && r.storageGb === 128)).toMatchObject({ amountDkk: 1200, source: "exact" });
  });
});

describe("stand og sælg-sidens pristabel (19/11-2026)", () => {
  it("små ridser giver ca. 10 % mindre, perfekt stand giver fuld pris", async () => {
    const { isWorn } = await import("../guide-price");
    expect(isWorn({ screen: "Små ridser", back: "Perfekt" })).toBe(true);
    expect(isWorn({ screen: "Perfekt", back: "Perfekt" })).toBe(false);
    const fine = computeGuidePrice({ baseOre: kr(3799), partPricesOre: [], factor: 0.75 });
    const worn = computeGuidePrice({ baseOre: kr(3799), partPricesOre: [], factor: 0.75, worn: true });
    if (fine.status !== "priced" || worn.status !== "priced") throw new Error("ingen pris");
    expect(worn.amountOre).toBeLessThan(fine.amountOre);
    expect(worn.amountOre).toBeGreaterThanOrEqual(fine.amountOre * 0.85);
    expect(worn.marginOre).toBeGreaterThan(fine.marginOre);
  });

  it("viser kun lagerstørrelser, vi selv har salgspriser på", async () => {
    const { guidePricesForModel } = await import("../guide-price-server");
    const listings: GuideListing[] = [3799, 3799, 3899].map((price) => ({ model: "iphone 15", catalogModel: "iPhone 15", storageGb: 128, priceOre: kr(price) }));
    const rows = guidePricesForModel(listings, { ...DEFAULT_BUYBACK_SETTINGS, guidePriceFactor: 0.75 }, "iPhone 15");
    expect(rows.map((row) => row.storageGb)).toEqual([128]);
    expect(rows[0].perfectDkk).toBeGreaterThan(rows[0].wornDkk ?? 0);
    expect(guidePricesForModel(listings, DEFAULT_BUYBACK_SETTINGS, "iPhone X")).toEqual([]);
  });
});

describe("referencepriser for alle modeller (19/11-2026)", () => {
  const on = { ...DEFAULT_BUYBACK_SETTINGS, publicPriceEnabled: true, guidePriceFactor: 0.75 };
  const noDb = {} as Parameters<typeof estimateGuidePrice>[0];
  const ref = (deviceType: string, brand: string, model: string, storage: string | null, dkk: number, ram: string | null = null) => ({
    deviceType, brand, model, storage, ram, baseOre: kr(dkk),
  });
  const references = [
    ref("Telefon", "Samsung", "Galaxy S24", "128GB", 2132),
    ref("Telefon", "Samsung", "Galaxy S24", "256GB", 2532),
    ref("Telefon", "Apple", "iPhone 11", "64GB", 1466),
    ref("Smartwatch", "Apple", "Apple Watch Ultra 2", null, 2382),
    ref("Laptop", "Apple", "MacBook Air 13\" (M2)", "256GB SSD", 5130, "8GB"),
    ref("Konsol", "Sony", "PlayStation 5", "825GB", 3000),
  ];
  const device = (d: Partial<BuybackDevice>): BuybackDevice => ({
    deviceType: "Telefon", brand: "Samsung", model: "Galaxy S24", storage: "128GB", ram: "",
    useCustom: false, brandCustom: "", modelCustom: "", ...d,
  });
  const fine: BuybackCondition = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };
  const price = async (d: Partial<BuybackDevice>, c: Partial<BuybackCondition> = {}) => {
    const result = await estimateGuidePrice(noDb, device(d), { ...fine, ...c }, on, { listings: [], references });
    return result.status === "priced" ? result.amountOre / 100 : null;
  };

  it("giver pris på modeller uden egne salgspriser", async () => {
    expect(await price({})).toBe(1100);
    expect(await price({ storage: "256GB" })).toBeGreaterThan(1100);
    expect(await price({ brand: "Apple", model: "iPhone 11", storage: "64GB" })).toBe(650);
    expect(await price({ deviceType: "Smartwatch", brand: "Apple", model: "Apple Watch Ultra 2", storage: "" }, { cloudLocked: "" })).toBe(1300);
  });

  it("bruger nærmeste mindre lager, når den præcise mangler, og aldrig mere", async () => {
    expect(await price({ storage: "512GB" })).toBe(await price({ storage: "256GB" }));
  });

  it("RAM over referencerækken tæller som den laveste, ukendt model giver ingen pris", async () => {
    const mac = { deviceType: "Laptop", brand: "Apple", model: "MacBook Air 13\" (M2)", storage: "256GB SSD" };
    expect(await price({ ...mac, ram: "8GB" }, { cloudLocked: "" })).toBe(3100);
    expect(await price({ model: "Galaxy S99" })).toBeNull();
    expect(await price({ useCustom: true })).toBeNull();
  });

  it("konsol: udvendig stand, ridser giver mindre, knækket eller fejl giver ingen pris", async () => {
    const ps5 = { deviceType: "Konsol", brand: "Sony", model: "PlayStation 5", storage: "825GB" };
    const outer = { back: "", battery: "", cloudLocked: "" };
    const perfect = await price(ps5, { ...outer, screen: "Perfekt" });
    const worn = await price(ps5, { ...outer, screen: "Buler/ridser" });
    expect(perfect).not.toBeNull();
    expect(worn).not.toBeNull();
    expect(worn as number).toBeLessThan(perfect as number);
    expect(await price(ps5, { ...outer, screen: "Knækket" })).toBeNull();
    expect(await price(ps5, { ...outer, allWorking: "Nej", brokenParts: ["HDMI"] })).toBeNull();
  });

  it("viser prisen i fin stand ved siden af, så formularen kan vise fradraget", async () => {
    const result = await estimateGuidePrice(noDb, device({}), { ...fine, screen: "Små ridser" }, on, { listings: [], references });
    expect(result.status).toBe("priced");
    if (result.status !== "priced") return;
    expect(result.topOre).toBe(kr(1100));
    expect(result.amountOre).toBeLessThan(kr(1100));
  });

  it("egne præcise salgspriser går forud for referencelisten", async () => {
    const listings: GuideListing[] = Array.from({ length: 3 }, () => ({ model: "iphone 13", catalogModel: "iPhone 13", storageGb: 128, priceOre: kr(2399) }));
    const result = await estimateGuidePrice(
      noDb,
      device({ brand: "Apple", model: "iPhone 13", storage: "128GB" }),
      fine,
      on,
      { listings, references: [ref("Telefon", "Apple", "iPhone 13", "128GB", 9000)] },
    );
    expect(result).toMatchObject({ status: "priced", base: { source: "exact" } });
  });

  it("mere lagerplads giver aldrig en lavere pris end den mindre variant, vi selv sælger", async () => {
    const listings: GuideListing[] = Array.from({ length: 3 }, () => ({ model: "iphone 16", catalogModel: "iPhone 16", storageGb: 128, priceOre: kr(5299) }));
    const run = (storage: string, refDkk: number) =>
      estimateGuidePrice(noDb, device({ brand: "Apple", model: "iPhone 16", storage }), fine, on, {
        listings,
        references: [ref("Telefon", "Apple", "iPhone 16", "256GB", refDkk)],
      });
    const small = await run("128GB", 5229);
    const lowRef = await run("256GB", 5229);
    const highRef = await run("256GB", 5629);
    expect(lowRef).toMatchObject({ status: "priced", base: { source: "smaller-storage", baseOre: kr(5299) } });
    expect(lowRef.status === "priced" && small.status === "priced" && lowRef.amountOre === small.amountOre).toBe(true);
    expect(highRef).toMatchObject({ status: "priced", base: { source: "reference", baseOre: kr(5629) } });
  });
});

describe("billige modeller (20/11-2026)", () => {
  it("sænker buddet, til mindste fortjeneste holder, i stedet for ingen pris", () => {
    // iPhone 12 mini 64 GB: 0,75 gav 600 kr. og for lille fortjeneste. Nu 550 kr.
    const result = computeGuidePrice({ baseOre: kr(1346), partPricesOre: [], factor: 0.75 });
    expect(result).toMatchObject({ status: "priced", amountOre: kr(550) });
    if (result.status === "priced") expect(result.marginOre).toBeGreaterThanOrEqual(GUIDE_PRICE.minMarginOre);
  });

  it("ændrer ikke priser, hvor fortjenesten allerede holder, og giver stadig ingen pris under mindste bud", () => {
    expect(computeGuidePrice({ baseOre: kr(2399), partPricesOre: [], factor: 0.75 })).toMatchObject({ amountOre: kr(1300) });
    expect(computeGuidePrice({ baseOre: kr(1028), partPricesOre: [], factor: 0.75 }).status).toBe("none");
  });
});
