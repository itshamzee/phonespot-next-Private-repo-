// @vitest-environment node
import { describe, expect, it } from "vitest";
import { planQuoteAdjustment } from "../quote-price";
import { caseLines, computeCaseTotals, type CaseItemRow } from "../case-money";
import { casePaymentLines } from "@/lib/pos/kasse-logic";

const item = (over: Partial<CaseItemRow> & Pick<CaseItemRow, "id" | "kind" | "description" | "unit_price_oere">): CaseItemRow => ({
  qty: 1,
  stock_status: "none",
  created_at: "2026-10-05T10:00:00Z",
  ...over,
});

describe("planQuoteAdjustment", () => {
  it("does nothing for legacy tickets without items", () => {
    expect(planQuoteAdjustment([], 99_900)).toEqual({ action: "none" });
  });
  it("does nothing when the quote equals the case total", () => {
    expect(planQuoteAdjustment([item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 79_900 })], 79_900)).toEqual({ action: "none" });
  });
  it("sets the price on the only priced line (up or down)", () => {
    const items = [item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 79_900 })];
    expect(planQuoteAdjustment(items, 99_900)).toEqual({ action: "set_price", itemId: "a", newUnitOere: 99_900 });
    expect(planQuoteAdjustment(items, 50_000)).toEqual({ action: "set_price", itemId: "a", newUnitOere: 50_000 });
  });
  it("ignores part lines (priced 0) when finding the only line", () => {
    const items = [
      item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 79_900 }),
      item({ id: "p", kind: "part", description: "Skærm del", unit_price_oere: 0, parent_item_id: "a" }),
    ];
    expect(planQuoteAdjustment(items, 89_900)).toMatchObject({ action: "set_price", itemId: "a", newUnitOere: 89_900 });
  });
  it("adds a Tilbudsjustering line for several lines and a higher quote", () => {
    const items = [
      item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 50_000 }),
      item({ id: "b", kind: "repair", description: "Batteri", unit_price_oere: 30_000 }),
    ];
    expect(planQuoteAdjustment(items, 90_000)).toEqual({ action: "add_line", amountOere: 10_000 });
  });
  it("blocks a lower quote on several lines with a Danish message", () => {
    const items = [
      item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 50_000 }),
      item({ id: "b", kind: "repair", description: "Batteri", unit_price_oere: 30_000 }),
    ];
    const plan = planQuoteAdjustment(items, 60_000);
    expect(plan.action).toBe("blocked");
    expect(plan.action === "blocked" && plan.message).toContain("Ret linjepriserne");
  });
  it("reuses an existing Tilbudsjustering line", () => {
    const items = [
      item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 50_000 }),
      item({ id: "b", kind: "repair", description: "Batteri", unit_price_oere: 30_000 }),
      item({ id: "j", kind: "free_text", description: "Tilbudsjustering", unit_price_oere: 10_000 }),
    ];
    expect(planQuoteAdjustment(items, 95_000)).toEqual({ action: "update_adjustment", itemId: "j", newUnitOere: 15_000 });
    expect(planQuoteAdjustment(items, 85_000)).toEqual({ action: "update_adjustment", itemId: "j", newUnitOere: 5_000 });
    expect(planQuoteAdjustment(items, 70_000).action).toBe("blocked");
  });
  it("falls back to an adjustment line when qty does not divide evenly", () => {
    const items = [item({ id: "a", kind: "repair", description: "Skærm", unit_price_oere: 10_000, qty: 2 })];
    expect(planQuoteAdjustment(items, 20_001)).toEqual({ action: "add_line", amountOere: 1 });
  });
});

describe("legacy ticket without items: the quote is the price in case total and POS", () => {
  it("case total and POS repair line equal the quote", () => {
    const lines = caseLines({}, [{ price_dkk: 999, created_at: "2026-10-01" }], []);
    const totals = computeCaseTotals(lines, [], {});
    expect(totals.total_oere).toBe(99_900);
    const cart = casePaymentLines({
      id: "t1",
      ticketNumber: "PS-1",
      description: "Sag PS-1",
      deviceLabel: "iPhone",
      totalOere: totals.total_oere,
      lines,
    } as never);
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ type: "repair_service", price: 99_900 });
  });
});
