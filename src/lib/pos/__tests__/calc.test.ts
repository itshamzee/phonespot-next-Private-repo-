import { describe, it, expect } from "vitest";
import {
  brugtmomsVat,
  computeSaleTotals,
  distributeDiscount,
  legacyPaymentMethod,
  standardVat,
  validatePayments,
  type SaleLineInput,
} from "../calc";

describe("distributeDiscount", () => {
  it("distributes proportionally and sums exactly to the discount", () => {
    expect(distributeDiscount([10000, 20000, 30000], 1000)).toEqual([167, 333, 500]);
  });

  it("gives leftover oere to the largest remainders, lowest index on ties", () => {
    // 100 over three equal lines: 33 each, one leftover goes to the first.
    expect(distributeDiscount([100, 100, 100], 100)).toEqual([34, 33, 33]);
  });

  it("always sums to the discount (property check)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const totals = [seed * 37 + 100, seed * 11 + 5, 9999 - seed, seed % 7 === 0 ? 0 : 1234];
      const base = totals.reduce((s, t) => s + t, 0);
      const discount = Math.floor((base * ((seed % 97) + 1)) / 100);
      const out = distributeDiscount(totals, discount);
      expect(out.reduce((s, x) => s + x, 0)).toBe(discount);
      out.forEach((a, i) => {
        expect(a).toBeLessThanOrEqual(totals[i]);
        expect(a).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("returns zeros for no discount and never touches zero-value lines", () => {
    expect(distributeDiscount([500, 0, 500], 0)).toEqual([0, 0, 0]);
    expect(distributeDiscount([500, 0, 500], 100)[1]).toBe(0);
  });

  it("rejects a discount above the total", () => {
    expect(() => distributeDiscount([100, 100], 201)).toThrow("discount_exceeds_total");
  });
});

describe("VAT", () => {
  it("standard VAT is 25/125 of the VAT-inclusive amount", () => {
    expect(standardVat(12500)).toBe(2500);
    expect(standardVat(10000)).toBe(2000);
  });

  it("brugtmoms is 25/125 of the margin (not 25 % of it)", () => {
    // 1000 kr sold, 600 kr purchase: margin 400 kr, brugtmoms 80 kr.
    expect(brugtmomsVat(100000, 60000)).toBe(8000);
  });

  it("brugtmoms is 0 on a negative or zero margin, never a credit", () => {
    expect(brugtmomsVat(50000, 60000)).toBe(0);
    expect(brugtmomsVat(60000, 60000)).toBe(0);
  });
});

describe("computeSaleTotals", () => {
  const device: SaleLineInput = { kind: "device", unitPrice: 100000, quantity: 1, costPrice: 80000, vatScheme: "brugtmoms" };
  const accessory: SaleLineInput = { kind: "sku_product", unitPrice: 20000, quantity: 1, costPrice: 5000, vatScheme: "regular" };

  it("applies brugtmoms AFTER the discount has been distributed", () => {
    const withDiscount = computeSaleTotals([device], 10000);
    // net 90000, margin 10000, vat 2000 (would be 4000 without the discount)
    expect(withDiscount.lines[0].net).toBe(90000);
    expect(withDiscount.brugtmomsTotal).toBe(2000);
    expect(computeSaleTotals([device], 0).brugtmomsTotal).toBe(4000);
  });

  it("distributes one discount over mixed lines and totals add up", () => {
    const t = computeSaleTotals([device, accessory], 12000);
    expect(t.lines.map((l) => l.discount)).toEqual([10000, 2000]);
    expect(t.subtotal).toBe(120000);
    expect(t.total).toBe(108000);
    expect(t.brugtmomsTotal).toBe(2000);
    expect(t.vatTotal).toBe(3600); // 18000 / 5
  });

  it("does not discount a deposit line, and carries 25 % VAT on it", () => {
    const deposit: SaleLineInput = { kind: "deposit", unitPrice: 50000, quantity: 1, costPrice: null, vatScheme: "regular" };
    const free: SaleLineInput = { kind: "free_text", unitPrice: 50000, quantity: 1, costPrice: null, vatScheme: "regular" };
    const t = computeSaleTotals([deposit, free], 10000);
    expect(t.lines.map((l) => l.discount)).toEqual([0, 10000]);
    expect(t.total).toBe(90000);
    expect(t.lines[0].vat).toBe(10000);
    expect(() => computeSaleTotals([deposit], 1)).toThrow("discount_exceeds_total");
  });

  it("brugtmoms on a loss-making device is 0 and contributes no negative VAT", () => {
    const loss: SaleLineInput = { kind: "device", unitPrice: 50000, quantity: 1, costPrice: 60000, vatScheme: "brugtmoms" };
    expect(computeSaleTotals([loss]).brugtmomsTotal).toBe(0);
  });
});

describe("validatePayments (split payment)", () => {
  it("accepts lines that sum exactly to the total", () => {
    const r = validatePayments(
      [
        { type: "kontant", amountOere: 50000 },
        { type: "kort_terminal", amountOere: 40000 },
      ],
      90000,
    );
    expect(r).toEqual({ ok: true, sum: 90000 });
  });

  it("rejects under- and over-payment", () => {
    expect(validatePayments([{ type: "kontant", amountOere: 100 }], 200)).toMatchObject({ ok: false, code: "payment_mismatch" });
    expect(validatePayments([{ type: "kontant", amountOere: 300 }], 200)).toMatchObject({ ok: false, code: "payment_mismatch" });
  });

  it("rejects unknown types, non-positive and fractional amounts", () => {
    expect(validatePayments([{ type: "bitcoin", amountOere: 100 }], 100)).toMatchObject({ code: "invalid_payment_type" });
    expect(validatePayments([{ type: "kontant", amountOere: 0 }], 0)).toMatchObject({ code: "invalid_payment_amount" });
    expect(validatePayments([{ type: "kontant", amountOere: 10.5 }], 10)).toMatchObject({ code: "invalid_payment_amount" });
  });

  it("requires a reference for tilgodebevis and gavekort", () => {
    expect(validatePayments([{ type: "gavekort", amountOere: 100 }], 100)).toMatchObject({ code: "payment_reference_required" });
    expect(validatePayments([{ type: "gavekort", amountOere: 100, reference: "GK-1" }], 100).ok).toBe(true);
  });

  it("a zero-total sale takes no payment lines", () => {
    expect(validatePayments([], 0).ok).toBe(true);
    expect(validatePayments([], 100).ok).toBe(false);
  });
});

describe("legacyPaymentMethod", () => {
  it("maps single types for old readers and marks splits", () => {
    expect(legacyPaymentMethod(["kontant"])).toBe("cash");
    expect(legacyPaymentMethod(["kort_terminal"])).toBe("card");
    expect(legacyPaymentMethod(["mobilepay", "mobilepay"])).toBe("mobilepay");
    expect(legacyPaymentMethod(["kontant", "kort_terminal"])).toBe("split");
    expect(legacyPaymentMethod([])).toBeNull();
  });
});
