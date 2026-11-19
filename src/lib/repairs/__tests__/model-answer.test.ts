import { describe, expect, it } from "vitest";

import { buildRepairModelAnswer, type ModelServiceLike } from "@/lib/repairs/model-answer";

const svc = (over: Partial<ModelServiceLike>): ModelServiceLike => ({
  name: "Skærmskift (Budget)",
  slug: "skaermskift-budget",
  price_dkk: 899,
  estimated_minutes: 30,
  warranty_info: "Livstidsgaranti på arbejde og dele",
  quality_tier: "standard",
  service_category: "Skærmskift",
  ...over,
});

const iphone: ModelServiceLike[] = [
  svc({}),
  svc({ name: "Skærmskift (OEM)", slug: "skaermskift-oem", price_dkk: 1199, quality_tier: "premium" }),
  svc({ name: "Skærmskift (Original)", slug: "skaermskift-original", price_dkk: 1799, quality_tier: "original", estimated_minutes: 45 }),
  svc({ name: "Batteriskift", slug: "batteriskift", price_dkk: 499, service_category: "Batteri", quality_tier: null, warranty_info: "6 måneders garanti" }),
  svc({ name: "Ladestik", slug: "ladestik", price_dkk: 599, service_category: "Ladestik", quality_tier: null, estimated_minutes: 60 }),
  svc({ name: "Diagnostik", slug: "diagnostik", price_dkk: 0, service_category: "Fejlsøgning", quality_tier: null }),
];

const base = { modelName: "iPhone 15", deviceType: "smartphone", storeCities: ["Vejle", "Slagelse"] };

describe("buildRepairModelAnswer", () => {
  it("svarer med pris på skærm og batteri, tid og garanti fra prislisten", () => {
    const r = buildRepairModelAnswer({ ...base, services: iphone })!;
    expect(r.answer).toContain("iPhone 15 reparation hos PhoneSpot i Vejle og Slagelse: skærmskift fra 899 kr. og batteriskift fra 499 kr.");
    expect(r.answer).toContain("30–45 min.");
    expect(r.answer).toContain("livstidsgaranti");
    expect(r.answer).toContain("6 måneders garanti på batteriskift");
  });

  it("lister kvaliteterne i skærm-FAQ'en og samler øvrige reparationer", () => {
    const r = buildRepairModelAnswer({ ...base, services: iphone })!;
    const q = r.faqs.map((f) => f.question);
    expect(q).toContain("Hvad koster skærmskift på iPhone 15?");
    expect(r.faqs[0].answer).toContain("Budget 899 kr., OEM 1.199 kr. og Original 1.799 kr.");
    expect(r.faqs.find((f) => f.question.startsWith("Hvad koster andre"))?.answer).toContain("nyt ladestik fra 599 kr.");
  });

  it("lover ikke livstidsgaranti, når prislisten ikke har den", () => {
    const r = buildRepairModelAnswer({
      ...base,
      services: iphone.map((s) => ({ ...s, warranty_info: null })),
    })!;
    expect(r.answer).not.toContain("livstid");
    expect(r.faqs.some((f) => f.question.includes("garanti"))).toBe(false);
  });

  it("nævner ingen tid, når en af kerneydelserne mangler oplyst tid", () => {
    const r = buildRepairModelAnswer({
      ...base,
      services: iphone.map((s) => (s.slug === "skaermskift-oem" ? { ...s, estimated_minutes: null } : s)),
    })!;
    expect(r.answer).not.toMatch(/min\./);
    expect(r.answer).not.toMatch(/\.\./);
    expect(r.faqs.some((f) => f.question.startsWith("Hvor lang tid"))).toBe(false);
  });

  it("springer konsoller og modeller uden priser over", () => {
    expect(buildRepairModelAnswer({ ...base, deviceType: "console", services: iphone })).toBeNull();
    expect(buildRepairModelAnswer({ ...base, services: [] })).toBeNull();
    expect(buildRepairModelAnswer({ ...base, services: [iphone[5]] })).toBeNull();
  });

  it("nævner ikke indsendelse eller livstidsgaranti for husholdningsapparater", () => {
    const r = buildRepairModelAnswer({
      ...base,
      modelName: "Dyson V11",
      deviceType: "appliance",
      services: [svc({ name: "Nyt batteri", slug: "batteri", price_dkk: 799, service_category: "Batteri", warranty_info: "12 måneders garanti på dele og arbejde", quality_tier: null })],
    })!;
    const text = r.answer + r.faqs.map((f) => f.answer).join(" ");
    expect(text).not.toMatch(/fragtlabel|livstid|6 måneders/);
    expect(text).toContain("12 måneders garanti");
  });
});
