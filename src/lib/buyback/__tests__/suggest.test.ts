import { describe, it, expect } from "vitest";
import { suggestForLead } from "../suggest";
import { DEFAULT_BUYBACK_SETTINGS } from "../settings";
import { makeFakeClient } from "./fake-supabase";

const dev = { deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: "", useCustom: false, brandCustom: "", modelCustom: "" };
const good = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };

const tables = {
  product_templates: [{ id: "t1", model: "iPhone 12", base_price_a: 250000 }],
  devices: [{ selling_price: 300000, status: "listed", storage: "128GB" }],
  foneday_catalog: [
    { category: "Display", quality: "Refurbished", price_dkk: 33000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Display Refurbished" },
  ],
  buyback_prices: [],
};

describe("suggestForLead", () => {
  it("suggests the aim offer for a single perfect device", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, { devices: [{ device: dev, condition: good }] }, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("ok");
    expect(s.totalAimOre).toBe(180000);
    expect(s.totalFloorOre).toBe(210000);
    expect(s.perDevice).toHaveLength(1);
    expect(s.perDevice[0].label).toBe("Apple iPhone 12 128GB");
  });

  it("sums two devices", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(
      client,
      { devices: [{ device: dev, condition: good }, { device: dev, condition: good }] },
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(s.totalAimOre).toBe(360000);
    expect(s.perDevice).toHaveLength(2);
  });

  it("goes manual if any single device cannot be priced", async () => {
    const { client } = makeFakeClient(tables);
    const unknown = { ...dev, model: "" };
    const s = await suggestForLead(
      client,
      { devices: [{ device: dev, condition: good }, { device: unknown, condition: good }] },
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(s.status).toBe("manual");
    expect(s.totalAimOre).toBe(0);
    expect(s.manualReason).toBeTruthy();
  });

  it("names the device that failed in the reason", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(
      client,
      { devices: [{ device: dev, condition: { ...good, allWorking: "Nej", brokenParts: ["Kamera"] } }] },
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(s.manualReason).toContain("Apple iPhone 12 128GB");
    expect(s.manualReason).toMatch(/kamera/i);
  });

  it("suggests declining an iCloud-locked device", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, { devices: [{ device: dev, condition: { ...good, cloudLocked: "Ja" } }] }, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("manual");
    expect(s.suggestDecline).toBe(true);
  });

  it("goes manual with an explicit reason when the lead has no devices", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, {}, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("manual");
    expect(s.manualReason).toMatch(/ingen enheder/i);
  });

  it("reads the legacy metadata shape too", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, { device: dev, condition: good }, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("ok");
    expect(s.totalAimOre).toBe(180000);
  });
});
