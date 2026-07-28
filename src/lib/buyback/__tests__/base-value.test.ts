import { describe, it, expect } from "vitest";
import { lookupBaseValueOre } from "../base-value";
import { makeFakeClient } from "./fake-supabase";

describe("lookupBaseValueOre", () => {
  it("returns the min listed selling_price for the matching template", async () => {
    const { client } = makeFakeClient({
      product_templates: [{ id: "t1", model: "iPhone 12", base_price_a: 250000 }],
      devices: [
        { selling_price: 299900, status: "listed", storage: "128GB" },
        { selling_price: 279900, status: "listed", storage: "128GB" },
      ],
    });
    expect(await lookupBaseValueOre(client, "iPhone 12", "128GB")).toBe(279900);
  });

  it("falls back to template.base_price_a when no listed devices exist", async () => {
    const { client } = makeFakeClient({
      product_templates: [{ id: "t1", model: "iPhone 12", base_price_a: 250000 }],
      devices: [],
    });
    expect(await lookupBaseValueOre(client, "iPhone 12", "128GB")).toBe(250000);
  });

  it("returns null when the model has no template", async () => {
    const { client } = makeFakeClient({ product_templates: [], devices: [] });
    expect(await lookupBaseValueOre(client, "iPhone 99", "128GB")).toBeNull();
  });

  it("returns null when no listed device and no base_price_a", async () => {
    const { client } = makeFakeClient({
      product_templates: [{ id: "t1", model: "iPhone 12", base_price_a: null }],
      devices: [],
    });
    expect(await lookupBaseValueOre(client, "iPhone 12", "128GB")).toBeNull();
  });
});

describe("lookupBaseValueOre with duplicate templates", () => {
  it("uses the first template when two share a model name", async () => {
    const { client, calls } = makeFakeClient({
      product_templates: [
        { id: "t1", model: "iPhone 12", base_price_a: 250000 },
        { id: "t2", model: "iPhone 12", base_price_a: 999000 },
      ],
      devices: [],
    });
    expect(await lookupBaseValueOre(client, "iPhone 12", "128GB")).toBe(250000);
    const call = calls.find((c) => c.table === "product_templates");
    expect(call?.ops).toContainEqual(["limit", 1]);
  });
});
