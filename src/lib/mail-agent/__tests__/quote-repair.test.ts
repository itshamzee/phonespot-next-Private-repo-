import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchRepairModels, quoteRepairImpl } from "@/lib/mail-agent/quote-repair";
import type { ToolContext } from "@/lib/mail-agent/tools";

type Row = Record<string, unknown>;

function fakeSupabase(tables: Record<string, Row[]>) {
  function query(table: string) {
    const rows = tables[table] ?? [];
    const filters: ((r: Row) => boolean)[] = [];
    const run = () => rows.filter((r) => filters.every((f) => f(r)));
    const api = {
      select: () => api,
      eq: (col: string, v: unknown) => {
        filters.push((r) => r[col] === v);
        return api;
      },
      order: () => api,
      limit: () => api,
      maybeSingle: async () => ({ data: run()[0] ?? null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: run() }),
    };
    return api;
  }
  return { from: (t: string) => query(t) } as never;
}

function ctxFor(sb: never): ToolContext {
  return { supabase: sb, verified: { emails: [] }, log: [], outputs: [], scopeMismatch: { value: false } };
}

const M = (id: string, name: string, brand = "Apple") => ({ id, name, brand });
const iphones = [M("a", "iPhone 13"), M("b", "iPhone 13 mini"), M("c", "iPhone 13 Pro"), M("d", "iPhone 13 Pro Max")];

describe("matchRepairModels", () => {
  it("exact normalised name wins", () => {
    expect(matchRepairModels("iphone 13 pro", iphones).map((m) => m.id)).toEqual(["c"]);
    expect(matchRepairModels("iPhone 13", iphones).map((m) => m.id)).toEqual(["a"]);
  });
  it("is ambiguous on a bare number", () => {
    expect(matchRepairModels("13", iphones)).toHaveLength(4);
  });
  it("returns nothing for unknown models", () => {
    expect(matchRepairModels("galaxy s99", [M("s", "Galaxy S24", "Samsung")])).toEqual([]);
  });
  it("normalises brand prefix, galaxy, spaces and hyphens", () => {
    const sam = [M("s", "Galaxy S24 Ultra", "Samsung"), M("t", "Galaxy S24", "Samsung")];
    expect(matchRepairModels("Samsung Galaxy  S24", sam).map((m) => m.id)).toEqual(["t"]);
    expect(matchRepairModels("s24-ultra", sam).map((m) => m.id)).toEqual(["s"]);
    expect(matchRepairModels("Apple iPhone 13", iphones).map((m) => m.id)).toEqual(["a"]);
  });
  it("matches whole tokens only", () => {
    expect(matchRepairModels("iphone 1", iphones)).toEqual([]);
  });
});

const tables = {
  repair_models: [
    { id: "a", name: "iPhone 13", active: true, repair_brands: { name: "Apple" } },
    { id: "b", name: "iPhone 13 mini", active: true, repair_brands: { name: "Apple" } },
    { id: "c", name: "iPhone 12", active: true, repair_brands: { name: "Apple" } },
  ],
  repair_services: [
    { model_id: "c", name: "Skærm Budget", price_dkk: 1000, quality_tier: "standard", estimated_minutes: 45, service_category: "Skærmskift", active: true },
    { model_id: "c", name: "Skærm Original", price_dkk: 1500, quality_tier: "original", estimated_minutes: null, service_category: "Skærmskift", active: true },
    { model_id: "c", name: "Batteri", price_dkk: 500, quality_tier: "premium", estimated_minutes: 30, service_category: "Batteriskift", active: true },
  ],
};
const inCampaign = Date.parse("2026-11-19T12:00:00+01:00");
const outside = Date.parse("2027-01-15T12:00:00+01:00");

describe("quoteRepairImpl", () => {
  // The campaign module honours a preview switch; make sure it is off.
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_CAMPAIGN_PREVIEW", ""));
  afterEach(() => vi.unstubAllEnvs());

  it("lists candidates for an ambiguous model, no amounts", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "13" }, inCampaign);
    expect(out.startsWith("Flere modeller passer:")).toBe(true);
    expect(out).toContain("iPhone 13 mini");
    expect(out).not.toMatch(/kr\./);
  });
  it("reports unknown models with a link", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "galaxy s99" }, inCampaign);
    expect(out).toContain("Ingen model fundet");
    expect(out).toContain("phonespot.dk/reparation");
    expect(out).not.toMatch(/kr\./);
  });
  it("applies the campaign price", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12", category: "Skærmskift" }, inCampaign);
    expect(out).toContain("900 kr.");
    expect(out).toContain("1.350 kr.");
    expect(out).toContain("kampagnepris");
    expect(out).toContain("Budget");
    expect(out).toContain("Original");
    expect(out).toContain("45 min");
    expect(ctx.log[0]).toEqual({ tool: "quote_repair", input: { model: "iphone 12", category: "Skærmskift" }, hits: 1 });
  });
  it("shows normal prices outside the campaign", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12", category: "Skærmskift" }, outside);
    expect(out).toContain("1.000 kr.");
    expect(out).toContain("1.500 kr.");
    expect(out).not.toContain("kampagnepris");
  });
  it("gives a from-price per category without category", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12" }, outside);
    expect(out).toContain("Skærmskift: fra 1.000 kr.");
    expect(out).toContain("Batteriskift: fra 500 kr.");
  });
});
