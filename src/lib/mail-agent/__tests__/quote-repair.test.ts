import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchRepairModels, quoteRepairImpl } from "@/lib/mail-agent/quote-repair";
import type { ToolContext } from "@/lib/mail-agent/tools";

type Row = Record<string, unknown>;
type Fail = { table: string; err: unknown };

/** Chainable fake honouring .eq filters; `fail` makes one table return an error. */
function fakeSupabase(tables: Record<string, Row[]>, fail?: Fail) {
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
      then: (resolve: (v: unknown) => void) =>
        fail && fail.table === table ? resolve({ data: null, error: fail.err }) : resolve({ data: run(), error: null }),
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
const ids = (ms: { id: string }[]) => ms.map((m) => m.id);

describe("matchRepairModels", () => {
  it("exact normalised name wins", () => {
    expect(matchRepairModels("iphone 13 pro", iphones).exact?.id).toBe("c");
    expect(matchRepairModels("iPhone 13", iphones).exact?.id).toBe("a");
  });
  it("is ambiguous on a bare number", () => {
    const m = matchRepairModels("13", iphones);
    expect(m.exact).toBeNull();
    expect(m.candidates).toHaveLength(4);
  });
  it("returns nothing for unknown models", () => {
    const m = matchRepairModels("galaxy s99", [M("s", "Galaxy S24", "Samsung")]);
    expect(m.exact).toBeNull();
    expect(m.candidates).toEqual([]);
  });
  it("normalises brand prefix, galaxy, spaces and hyphens", () => {
    const sam = [M("s", "Galaxy S24 Ultra", "Samsung"), M("t", "Galaxy S24", "Samsung")];
    expect(matchRepairModels("Samsung Galaxy  S24", sam).exact?.id).toBe("t");
    expect(matchRepairModels("s24-ultra", sam).exact?.id).toBe("s");
    expect(matchRepairModels("Apple iPhone 13", iphones).exact?.id).toBe("a");
  });
  it("matches whole tokens only", () => {
    expect(matchRepairModels("iphone 1", iphones).candidates).toEqual([]);
  });
  it("does not treat a more specific model as an exact hit", () => {
    const m = matchRepairModels("iPhone 13 Pro", [M("d", "iPhone 13 Pro Max")]);
    expect(m.exact).toBeNull();
    expect(ids(m.candidates)).toEqual(["d"]);
  });
});

const brand = { name: "Apple" };
const tables = {
  repair_models: [
    { id: "a", name: "iPhone 13", active: true, repair_brands: brand },
    { id: "b", name: "iPhone 13 mini", active: true, repair_brands: brand },
    { id: "c", name: "iPhone 12", active: true, repair_brands: brand },
    { id: "e", name: "iPhone 17 Pro", active: true, repair_brands: brand },
    { id: "f", name: "iPhone 13 Pro Max", active: true, repair_brands: brand },
    { id: "g", name: "iPhone 5", active: false, repair_brands: brand },
  ],
  repair_services: [
    { model_id: "c", name: "Skærm Budget", price_dkk: 1000, quality_tier: "standard", estimated_minutes: 45, service_category: "Skærmskift", active: true },
    { model_id: "c", name: "Skærm Original", price_dkk: 1500, quality_tier: "original", estimated_minutes: null, service_category: "Skærmskift", active: true },
    { model_id: "c", name: "Skærm Gammel", price_dkk: 100, quality_tier: "standard", estimated_minutes: 45, service_category: "Skærmskift", active: false },
    { model_id: "c", name: "Gratis diagnose", price_dkk: 50, quality_tier: null, estimated_minutes: 10, service_category: "Diagnose", active: true },
    { model_id: "c", name: "Software opdatering", price_dkk: 99, quality_tier: null, estimated_minutes: 10, service_category: "Batteriskift", active: true },
    { model_id: "c", name: "Kamera uden pris", price_dkk: 0, quality_tier: null, estimated_minutes: null, service_category: "Kamera", active: true },
    { model_id: "c", name: "Batteri", price_dkk: 500, quality_tier: "premium", estimated_minutes: 30, service_category: "Batteriskift", active: true },
  ],
};
const inCampaign = Date.parse("2026-11-19T12:00:00+01:00");
const outside = Date.parse("2027-01-15T12:00:00+01:00");
const TECH = "Prisopslaget fejlede teknisk. Oplys ingen pris, og lad en medarbejder tage over.";

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
    expect(out).toContain("45 min");
    expect(ctx.log[0]).toEqual({ tool: "quote_repair", input: { model: "iphone 12", category: "Skærmskift" }, hits: 1 });
  });
  it("shows normal prices outside the campaign", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12", category: "Skærmskift" }, outside);
    expect(out).toContain("1.000 kr.");
    expect(out).toContain("1.500 kr.");
    expect(out).not.toContain("kampagnepris");
    expect(out).not.toContain("100 kr.");
  });
  it("skips the quality label when the name already contains it", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12", category: "Skærmskift" }, outside);
    expect(out).toContain("Skærm Budget: 1.000 kr.");
    expect(out).toContain("Skærm Original: 1.500 kr.");
    expect(out).not.toContain("(Budget)");
  });
  it("shows the quality label when the name lacks it", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12", category: "Batteriskift" }, outside);
    expect(out).toContain("Batteri (OEM): 500 kr.");
    expect(out).not.toContain("Software");
  });
  it("gives a from-price per summary category; non-repairs and price 0 never count", async () => {
    const ctx = ctxFor(fakeSupabase(tables));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12" }, outside);
    expect(out).toContain("Skærmskift: fra 1.000 kr.");
    expect(out).toContain("Batteriskift: fra 500 kr.");
    expect(out).not.toMatch(/Diagnose|Kamera|99 kr|50 kr|100 kr/);
  });
  it("never returns a more specific model's price", async () => {
    const onlyProMax = fakeSupabase({ ...tables, repair_models: tables.repair_models.filter((m) => m.id === "f") });
    const out = await quoteRepairImpl(ctxFor(onlyProMax), { model: "iPhone 13 Pro" }, outside);
    expect(out).toContain("Mente du iPhone 13 Pro Max?");
    expect(out).not.toMatch(/kr\./);
    const out2 = await quoteRepairImpl(ctxFor(fakeSupabase(tables)), { model: "iPhone 17" }, outside);
    expect(out2).toContain("Mente du iPhone 17 Pro?");
    expect(out2).not.toMatch(/kr\./);
  });
  it("ignores inactive models", async () => {
    const out = await quoteRepairImpl(ctxFor(fakeSupabase(tables)), { model: "iphone 5" }, outside);
    expect(out).toContain("Ingen model fundet");
  });
  it("caps the candidate list at 8", async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, name: `Pixel 9 V${i}`, active: true, repair_brands: { name: "Google" } }));
    const out = await quoteRepairImpl(ctxFor(fakeSupabase({ repair_models: many, repair_services: [] })), { model: "pixel 9" }, outside);
    expect(out).toContain("Bed kunden om den præcise model.");
    expect(out).toContain("V7");
    expect(out).not.toContain("V8");
  });
  it.each(["repair_models", "repair_services"])("returns a technical error when %s fails", async (table) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = ctxFor(fakeSupabase(tables, { table, err: { message: "boom" } }));
    const out = await quoteRepairImpl(ctx, { model: "iphone 12" }, outside);
    expect(out).toBe(TECH);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
