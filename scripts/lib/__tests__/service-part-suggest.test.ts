import { describe, expect, it } from "vitest";
import { kindOf, normalizeModel, parseApprovedLinks, suggestForService, validateLinks, existingIdsChunked, type PartIn, type ServiceIn } from "../service-part-suggest";

const svc = (over: Partial<ServiceIn> = {}): ServiceIn => ({ id: "s1", name: "Skærmskift", quality_tier: "premium", service_category: null, model: "iPhone 13", brand: "Apple", ...over });
const part = (over: Partial<PartIn>): PartIn => ({ shared_sku: "X", name: "Skærm", category: "Skærme", quality: null, device_models: ["iPhone 13"], ...over });
const catalog = [
  part({ shared_sku: "SCR-IP13-SOFT", name: "Skærm iPhone 13 Soft OLED", quality: "Premium Soft OLED" }),
  part({ shared_sku: "SCR-IP13-INCELL", name: "Skærm iPhone 13 In-Cell", quality: "Standard In-Cell" }),
  part({ shared_sku: "SCR-IP13P-SOFT", name: "Skærm iPhone 13 Pro Soft OLED", quality: "Premium Soft OLED", device_models: ["iPhone 13 Pro"] }),
  part({ shared_sku: "BAT-IP13", name: "Batteri iPhone 13", category: "Batterier", quality: null }),
];

describe("kindOf / normalizeModel", () => {
  it("classifies service names", () => {
    expect(kindOf("Skærmskift", null)).toBe("skaerm");
    expect(kindOf("Batteriskift", null)).toBe("batteri");
    expect(kindOf("Ladestik", null)).toBe("ladestik");
    expect(kindOf("Diagnose", null)).toBeNull();
  });
  it("normalises brand prefixes and punctuation, but keeps Pro apart", () => {
    expect(normalizeModel("Apple iPhone 13")).toBe("iphone 13");
    expect(normalizeModel("iPhone 13 Pro")).not.toBe(normalizeModel("iPhone 13"));
  });
});

describe("suggestForService", () => {
  it("picks the one part matching model, kind and quality with high confidence, pre-approved", () => {
    expect(suggestForService(svc(), catalog)).toMatchObject({ shared_sku: "SCR-IP13-SOFT", confidence: "høj", approve: "ja" });
    expect(suggestForService(svc({ quality_tier: "standard" }), catalog)).toMatchObject({ shared_sku: "SCR-IP13-INCELL", confidence: "høj" });
  });
  it("never matches a Pro part to the non-Pro model", () => {
    expect(suggestForService(svc({ model: "iPhone 13 Pro" }), catalog).shared_sku).toBe("SCR-IP13P-SOFT");
  });
  it("is not pre-approved when the quality cannot be told apart", () => {
    const r = suggestForService(svc({ quality_tier: "original" }), catalog);
    expect(r.confidence).toBe("lav");
    expect(r.approve).toBe("");
  });
  it("says ingen when nothing fits", () => {
    expect(suggestForService(svc({ name: "Diagnose" }), catalog)).toMatchObject({ shared_sku: "", confidence: "ingen" });
    expect(suggestForService(svc({ model: "Galaxy S24" }), catalog).confidence).toBe("ingen");
  });
});

describe("parseApprovedLinks", () => {
  it("takes only rows approved with ja and validates qty", () => {
    const csv = [
      "service_id,shared_sku,part_name,qty,approve",
      "s1,SCR-1,Skærm,,ja",
      "s2,BAT-1,Batteri,2, JA ",
      "s3,X,Nej tak,,",
      "s4,,Mangler sku,,ja",
      "s5,Y,For mange,99,ja",
    ].join("\n");
    const r = parseApprovedLinks(csv);
    expect(r.links).toEqual([
      { service_id: "s1", shared_sku: "SCR-1", part_name: "Skærm", qty: 1 },
      { service_id: "s2", shared_sku: "BAT-1", part_name: "Batteri", qty: 2 },
    ]);
    expect(r.errors).toHaveLength(2);
  });
});

describe("fix round 1", () => {
  it("does not match a back camera part to a back glass service", () => {
    const cat = [part({ shared_sku: "CAM", name: "Back Camera iPhone 13", category: "Kamera" })];
    expect(suggestForService(svc({ name: "Bagglas", quality_tier: null }), cat).confidence).toBe("ingen");
  });
  it("is only middel when the service has no quality to match on", () => {
    const one = [part({ shared_sku: "SCR-ONLY", name: "Skærm iPhone 13" })];
    const r = suggestForService(svc({ quality_tier: null }), one);
    expect(r).toMatchObject({ shared_sku: "SCR-ONLY", confidence: "middel", approve: "" });
  });
  it("round-trips a Danish Excel CSV: semicolons, BOM and CRLF", () => {
    const csv = ["\uFEFFservice_id;shared_sku;part_name;qty;approve", "s1;SCR-1;Skærm på øen å;;ja", "s2;X;Nej;;", ""].join("\r\n");
    const r = parseApprovedLinks(csv);
    expect(r.errors).toEqual([]);
    expect(r.links).toEqual([{ service_id: "s1", shared_sku: "SCR-1", part_name: "Skærm på øen å", qty: 1 }]);
  });
});

describe("validateLinks", () => {
  const links = [
    { service_id: "s1", shared_sku: "A", part_name: "Del A", qty: 1 },
    { service_id: "s2", shared_sku: "B", part_name: "Del B", qty: 1 },
  ];
  const deps = (over = {}) => ({
    existingServiceIds: async (ids: string[]) => new Set(ids),
    partExists: async () => true,
    ...over,
  });
  it("accepts good rows", async () => {
    expect(await validateLinks(links, deps())).toEqual([]);
  });
  it("reports unknown services, unknown skus and empty names", async () => {
    const errors = await validateLinks(
      [...links, { service_id: "s3", shared_sku: "C", part_name: "  ", qty: 1 }],
      deps({ existingServiceIds: async () => new Set(["s1", "s3"]), partExists: async (sku: string) => sku !== "C" }),
    );
    expect(errors).toHaveLength(3);
    expect(errors.join(" ")).toMatch(/s2/);
    expect(errors.join(" ")).toMatch(/C/);
  });
});

describe("round 2", () => {
  it("does not match a bare housing part to a back glass service", () => {
    const cat = [part({ shared_sku: "CH", name: "Camera housing iPhone 13", category: "Kamera" })];
    expect(suggestForService(svc({ name: "Bagglas", quality_tier: null }), cat).confidence).toBe("ingen");
    const back = [part({ shared_sku: "BG", name: "Back glass iPhone 13", category: "Bagglas" })];
    expect(suggestForService(svc({ name: "Bagglas", quality_tier: null }), back).shared_sku).toBe("BG");
  });
  it("looks up ids in chunks of 100 and merges the results", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => "s" + i);
    const calls: string[][] = [];
    const found = await existingIdsChunked(ids, async (chunk) => { calls.push(chunk); return chunk.filter((id) => id !== "s150"); });
    expect(calls.map((c) => c.length)).toEqual([100, 100, 50]);
    expect(found.size).toBe(249);
    expect(found.has("s150")).toBe(false);
    expect(found.has("s249")).toBe(true);
  });
});
