import { describe, it, expect } from "vitest";
import { estimateBuyback } from "../estimate";
import { DEFAULT_BUYBACK_SETTINGS } from "../settings";
import { makeFakeClient } from "./fake-supabase";
import type { BuybackDevice, BuybackCondition } from "../types";

function device(o: Partial<BuybackDevice> = {}): BuybackDevice {
  return {
    deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB",
    ram: "", useCustom: false, brandCustom: "", modelCustom: "", ...o,
  };
}
function condition(o: Partial<BuybackCondition> = {}): BuybackCondition {
  return {
    screen: "Perfekt", back: "Perfekt", battery: "God (80%+)",
    allWorking: "Ja", brokenParts: [], cloudLocked: "Nej", ...o,
  };
}

const baseTables = {
  product_templates: [{ id: "t1", model: "iPhone 12", base_price_a: 250000 }],
  devices: [{ selling_price: 300000, status: "listed", storage: "128GB" }],
  // Shaped like the real catalog: the marketing name lives in suitable_for,
  // model_codes hold manufacturer part numbers.
  foneday_catalog: [
    { category: "Display", quality: "Refurbished", price_dkk: 33000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Display Refurbished" },
    { category: "Charging Connector", quality: "Pulled A", price_dkk: 6000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Charging Connector Pulled A" },
  ],
};

describe("estimateBuyback", () => {
  it("flags manual when a reported broken part cannot be priced", async () => {
    const { client } = makeFakeClient(baseTables);
    const r = await estimateBuyback(
      client,
      device(),
      condition({ allWorking: "Nej", brokenParts: ["Kamera"] }),
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(r.status).toBe("manual");
    expect(r.manualReason).toMatch(/kamera/i);
  });

  it("still prices a device whose only broken part is chargeable", async () => {
    const { client } = makeFakeClient(baseTables);
    const r = await estimateBuyback(
      client,
      device(),
      condition({ allWorking: "Nej", brokenParts: ["Opladning"] }),
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(r.status).toBe("ok");
    expect(r.totalDeductionOre).toBe(6000);
  });

  it("prices a perfect known Apple device end to end", async () => {
    const { client } = makeFakeClient(baseTables);
    const r = await estimateBuyback(client, device(), condition(), DEFAULT_BUYBACK_SETTINGS);
    expect(r.status).toBe("ok");
    expect(r.saleValueOre).toBe(300000);
    expect(r.aimOfferOre).toBe(180000); // 3000 − 40% − 0
  });

  it("deducts the resolved screen part for a cracked screen", async () => {
    const { client } = makeFakeClient(baseTables);
    const r = await estimateBuyback(client, device(), condition({ screen: "Knust" }), DEFAULT_BUYBACK_SETTINGS);
    expect(r.totalDeductionOre).toBe(33000);
    expect(r.aimOfferOre).toBe(145000); // 147000 rounded down to a whole 50 kr
  });

  it("flags manual for an iCloud-locked device without hitting pricing", async () => {
    const { client } = makeFakeClient(baseTables);
    const r = await estimateBuyback(client, device(), condition({ cloudLocked: "Ja" }), DEFAULT_BUYBACK_SETTINGS);
    expect(r.status).toBe("manual");
    expect(r.manualReason).toMatch(/icloud|låst/i);
  });

  it("flags manual for a non-Apple device", async () => {
    const { client } = makeFakeClient(baseTables);
    const r = await estimateBuyback(client, device({ brand: "Samsung", model: "Galaxy S24" }), condition(), DEFAULT_BUYBACK_SETTINGS);
    expect(r.status).toBe("manual");
  });

  it("flags manual when the model has no template (unknown to our catalog)", async () => {
    const { client } = makeFakeClient({ ...baseTables, product_templates: [], devices: [] });
    const r = await estimateBuyback(client, device({ model: "iPhone 99" }), condition(), DEFAULT_BUYBACK_SETTINGS);
    expect(r.status).toBe("manual");
  });

  it("flags manual when a fault has no matching part in catalog", async () => {
    const { client } = makeFakeClient({ ...baseTables, foneday_catalog: [] });
    const r = await estimateBuyback(
      client,
      device(),
      condition({ screen: "Knust" }),
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(r.status).toBe("manual");
    expect(r.manualReason).toMatch(/reservedel|screen/i);
  });
});

describe("estimateBuyback base value chain", () => {
  it("falls back to buyback_prices when we have no sale price of our own", async () => {
    const { client } = makeFakeClient({
      ...baseTables,
      product_templates: [],
      devices: [],
      buyback_prices: [
        { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: null, base_price: 200000, active: true },
      ],
    });
    const r = await estimateBuyback(client, device(), condition(), DEFAULT_BUYBACK_SETTINGS);
    expect(r.status).toBe("ok");
    expect(r.saleValueOre).toBe(200000);
  });

  it("prefers our own sale price over the fallback table", async () => {
    const { client } = makeFakeClient({
      ...baseTables,
      buyback_prices: [
        { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: null, base_price: 200000, active: true },
      ],
    });
    const r = await estimateBuyback(client, device(), condition(), DEFAULT_BUYBACK_SETTINGS);
    expect(r.saleValueOre).toBe(300000);
  });

  it("stays manual when neither source knows the model", async () => {
    const { client } = makeFakeClient({ ...baseTables, product_templates: [], devices: [], buyback_prices: [] });
    const r = await estimateBuyback(client, device({ model: "iPhone 99" }), condition(), DEFAULT_BUYBACK_SETTINGS);
    expect(r.status).toBe("manual");
  });
});
