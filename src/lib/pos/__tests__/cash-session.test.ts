import { describe, it, expect } from "vitest";
import {
  computeCashDifference,
  computeExpectedCash,
  finalDifference,
  sumExpenses,
  validateCashClose,
} from "../cash-session";

describe("cash session maths", () => {
  it("expected = float + net cash payments - cash expenses", () => {
    const expected = computeExpectedCash({
      openingFloat: 50000,
      netCashPayments: 120000, // cash sales 145000 minus cash refunds 25000 (stored as negative rows)
      expenses: [
        { description: "Kaffe", amountOere: 3000 },
        { description: "Porto", amountOere: 2000 },
      ],
    });
    expect(expected).toBe(165000);
  });

  it("difference is counted minus expected (positive = surplus)", () => {
    expect(computeCashDifference(164000, 165000)).toBe(-1000);
    expect(computeCashDifference(165500, 165000)).toBe(500);
    expect(computeCashDifference(165000, 165000)).toBe(0);
  });

  it("sums expenses", () => {
    expect(sumExpenses([])).toBe(0);
    expect(sumExpenses([{ description: "a", amountOere: 100 }, { description: "b", amountOere: 250 }])).toBe(350);
  });

  it("adjustments after the lock change the final difference, not the locked one", () => {
    expect(finalDifference(-1000, [])).toBe(-1000);
    expect(finalDifference(-1000, [500, 200])).toBe(-300);
  });

  describe("validateCashClose", () => {
    it("accepts a normal close", () => {
      expect(validateCashClose({ countedCash: 100000, cashToBank: 50000, expenses: [] })).toEqual({ ok: true });
    });
    it("rejects negative or fractional counts", () => {
      expect(validateCashClose({ countedCash: -1, cashToBank: 0, expenses: [] })).toMatchObject({ ok: false, code: "invalid_counted_cash" });
      expect(validateCashClose({ countedCash: 10.5, cashToBank: 0, expenses: [] })).toMatchObject({ ok: false });
    });
    it("cannot bank more than was counted", () => {
      expect(validateCashClose({ countedCash: 1000, cashToBank: 1001, expenses: [] })).toMatchObject({ ok: false, code: "invalid_cash_to_bank" });
    });
    it("expenses need text and a positive amount", () => {
      expect(validateCashClose({ countedCash: 1000, cashToBank: 0, expenses: [{ description: " ", amountOere: 100 }] })).toMatchObject({ code: "invalid_expense" });
      expect(validateCashClose({ countedCash: 1000, cashToBank: 0, expenses: [{ description: "x", amountOere: 0 }] })).toMatchObject({ code: "invalid_expense" });
    });
  });
});
