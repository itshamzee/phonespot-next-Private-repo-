import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_DKK,
  activationGuard,
  applyPriceOp,
  bulkPriceSummary,
  formatKr,
  isValidPrice,
  parseAmount,
  previewBulkPrice,
  slugifyModel,
  uniqueSlug,
} from "../catalog-manage-rules";

describe("isValidPrice", () => {
  it("accepterer hele kroner over 0", () => {
    expect(isValidPrice(1)).toBe(true);
    expect(isValidPrice(1299)).toBe(true);
    expect(isValidPrice(MAX_PRICE_DKK)).toBe(true);
  });
  it("afviser 0, negative, decimaler, for høje og ikke-tal", () => {
    for (const v of [0, -5, 12.5, MAX_PRICE_DKK + 1, NaN, Infinity, "100", null, undefined]) expect(isValidPrice(v)).toBe(false);
  });
});

describe("activationGuard", () => {
  it("kræver en pris over 0 før aktivering", () => {
    expect(activationGuard(899)).toEqual({ ok: true });
    for (const v of [0, null, undefined, -1]) {
      const res = activationGuard(v);
      expect(res.ok).toBe(false);
    }
  });
});

describe("bulk-pris", () => {
  const rows = [
    { id: "a", price_dkk: 500 },
    { id: "b", price_dkk: 999 },
    { id: "c", price_dkk: 30 },
  ];

  it("plus/minus kroner", () => {
    expect(previewBulkPrice(rows, { mode: "delta", amount: 50 }).map((p) => p.to)).toEqual([550, 1049, 80]);
    expect(previewBulkPrice(rows, { mode: "delta", amount: -100 }).map((p) => [p.to, p.valid])).toEqual([
      [400, true],
      [899, true],
      [-70, false],
    ]);
  });

  it("procent afrundes til hele kroner", () => {
    expect(applyPriceOp(999, { mode: "percent", amount: 10 })).toBe(1099); // 1098.9
    expect(applyPriceOp(500, { mode: "percent", amount: -5 })).toBe(475);
    expect(applyPriceOp(333, { mode: "percent", amount: 10 })).toBe(366); // 366.3
    expect(applyPriceOp(335, { mode: "percent", amount: 10 })).toBe(369); // 368.5 -> 369
  });

  it("markerer priser under 1 kr. og over loftet som ugyldige", () => {
    expect(previewBulkPrice([{ id: "x", price_dkk: 10 }], { mode: "percent", amount: -95 })[0]).toMatchObject({ to: 1, valid: true });
    expect(previewBulkPrice([{ id: "x", price_dkk: 10 }], { mode: "percent", amount: -99 })[0]).toMatchObject({ to: 0, valid: false });
    expect(previewBulkPrice([{ id: "x", price_dkk: MAX_PRICE_DKK }], { mode: "delta", amount: 1 })[0].valid).toBe(false);
  });

  it("opsummerer ændrede, uændrede og ugyldige", () => {
    const preview = previewBulkPrice(rows, { mode: "delta", amount: -30 });
    expect(bulkPriceSummary(preview)).toEqual({ changed: 2, invalid: 1, unchanged: 0 });
    expect(bulkPriceSummary(previewBulkPrice(rows, { mode: "delta", amount: 0 }))).toEqual({ changed: 0, invalid: 0, unchanged: 3 });
  });
});

describe("parseAmount", () => {
  it("forstår +/-, komma og mellemrum", () => {
    expect(parseAmount("+50")).toBe(50);
    expect(parseAmount("-10")).toBe(-10);
    expect(parseAmount(" 12,5 ")).toBe(12.5);
    expect(parseAmount("−20")).toBe(-20);
  });
  it("giver null for tomt og ugyldigt", () => {
    for (const v of ["", "-", "abc", "1,2,3", "10 kr"]) expect(parseAmount(v)).toBeNull();
  });
});

describe("slug", () => {
  it("laver url-venlige navne", () => {
    expect(slugifyModel("iPhone 18 Pro Max")).toBe("iphone-18-pro-max");
    expect(slugifyModel("  Galaxy Z Flip6 (Æ/Ø) ")).toBe("galaxy-z-flip6-ae-oe");
    expect(slugifyModel("!!!")).toBe("");
  });
  it("finder første ledige slug", () => {
    expect(uniqueSlug("iphone-18", [])).toBe("iphone-18");
    expect(uniqueSlug("iphone-18", ["iphone-18"])).toBe("iphone-18-2");
    expect(uniqueSlug("iphone-18", ["iphone-18", "iphone-18-2"])).toBe("iphone-18-3");
  });
});

describe("formatKr", () => {
  it("formaterer hele kroner", () => {
    expect(formatKr(1299)).toMatch(/^1\.299 kr\.$/);
    expect(formatKr(null)).toBe("");
  });
});
