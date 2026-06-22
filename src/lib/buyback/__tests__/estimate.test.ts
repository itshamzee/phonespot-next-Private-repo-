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
  foneday_catalog: [
    { category: "Display", quality: "Refurbished", price_dkk: 33000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Display Refurbished iPhone 12" },
    { category: "Charging Connector", quality: "Pulled", price_dkk: 6000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Charging Connector iPhone 12" },
  ],
};

describe("estimateBuyback", () => {
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
    expect(r.aimOfferOre).toBe(147000);
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
