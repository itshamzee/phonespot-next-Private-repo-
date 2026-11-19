import { describe, expect, it } from "vitest";
import { SUMMARY_CATEGORIES } from "@/lib/repairs/price-list";
import { SYMPTOMS, diagnoseImpl } from "@/lib/mail-agent/symptoms";
import type { ToolContext } from "@/lib/mail-agent/tools";

function ctx(): ToolContext {
  return { supabase: {} as never, verified: { emails: [] }, log: [], outputs: [], scopeMismatch: { value: false } };
}

describe("SYMPTOMS", () => {
  it("has unique keys", () => {
    const keys = SYMPTOMS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("only uses known repair categories", () => {
    for (const s of SYMPTOMS) {
      for (const c of s.categories) expect(SUMMARY_CATEGORIES as readonly string[]).toContain(c);
    }
  });
  it("sends rows without a category to diagnosis", () => {
    for (const s of SYMPTOMS.filter((r) => r.categories.length === 0)) expect(s.needsDiagnosis).toBe(true);
  });
  it("never advises opening the device or rice", () => {
    for (const s of SYMPTOMS) expect(s.advice).not.toMatch(/ris|åbn(e)? (den|enheden) selv/i);
  });
  it("contains the required rows", () => {
    const keys = SYMPTOMS.map((s) => s.key);
    for (const k of [
      "sort_skaerm", "revnet_skaerm", "touch_virker_ikke", "streger_pletter_skaerm", "batteri_toemmes",
      "slukker_selv", "lader_ikke", "revnet_bagside", "kamera_sloeret", "ingen_lyd_mikrofon",
      "vandskade", "taender_ikke", "andet",
    ]) expect(keys).toContain(k);
    expect(SYMPTOMS.find((s) => s.key === "lader_ikke")?.categories).toEqual(["Opladerstik", "Batteriskift"]);
  });
});

describe("diagnoseImpl", () => {
  it("points sort_skaerm at quote_repair", async () => {
    const c = ctx();
    const out = await diagnoseImpl(c, { symptom_key: "sort_skaerm" });
    expect(out).toContain("Skærmskift");
    expect(out).toContain("Kald quote_repair med kategori Skærmskift for pris");
    expect(c.log[0]).toEqual({ tool: "diagnose", input: { symptom_key: "sort_skaerm" }, hits: 1 });
  });
  it("recommends free diagnosis for vandskade, with no number", async () => {
    const out = await diagnoseImpl(ctx(), { symptom_key: "vandskade" });
    expect(out).toContain("gratis diagnose");
    expect(out).not.toMatch(/\d/);
    expect(out).not.toContain("quote_repair");
  });
  it("handles unknown keys", async () => {
    expect(await diagnoseImpl(ctx(), { symptom_key: "xx" })).toContain("gratis diagnose");
  });
});
