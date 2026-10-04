import { describe, it, expect } from "vitest";
import { computeSaleTotals, standardVat } from "../calc";
import {
  canApplyDeposit,
  caseVatTotal,
  depositRemaining,
  depositVat,
  planDepositApplication,
} from "../deposit-math";
import { buildCreditNote, CreditNoteError, type OriginalLine } from "../credit-note";
import { buildJournalRows } from "../summary-csv";
import { aggregateDailySummary, type SummaryOrder } from "../daily-summary";

describe("deposit VAT", () => {
  it("a 500 kr deposit carries 100 kr VAT (25/125) on its receipt", () => {
    expect(depositVat(50_000)).toBe(10_000);
    const t = computeSaleTotals(
      [{ kind: "deposit", unitPrice: 50_000, quantity: 1, costPrice: null, vatScheme: "regular" }],
      0,
    );
    expect(t.total).toBe(50_000);
    expect(t.vatTotal).toBe(10_000);
  });

  it("deposits are never discountable", () => {
    expect(() =>
      computeSaleTotals([{ kind: "deposit", unitPrice: 50_000, quantity: 1, costPrice: null, vatScheme: "regular" }], 100),
    ).toThrow("discount_exceeds_total");
  });

  it("final payment: VAT on the full price, the applied deposit takes its own VAT back", () => {
    // 1.698 kr repair + 99 kr glass, 500 kr deposit deducted -> 1.297 kr to pay, VAT 259,40 (the design example)
    const t = computeSaleTotals(
      [
        { kind: "repair_service", unitPrice: 169_800, quantity: 1, costPrice: null, vatScheme: "regular" },
        { kind: "sku_product", unitPrice: 9_900, quantity: 1, costPrice: null, vatScheme: "regular" },
        { kind: "deposit_applied", unitPrice: -50_000, quantity: 1, costPrice: null, vatScheme: "regular" },
      ],
      0,
    );
    expect(t.total).toBe(129_700);
    expect(t.vatTotal).toBe(25_940);
    expect(t.lines[2].vat).toBe(-10_000);
  });

  it("total VAT over the deposit receipt and the pickup receipt equals the VAT on the full price", () => {
    const cases: Array<[number, number[]]> = [
      [169_800, [50_000]],
      [123_457, [33_333, 11_111]],
      [99_999, [1]],
      [50_001, [50_001]],
    ];
    for (const [full, deps] of cases) {
      expect(caseVatTotal(full, deps).vatTotal).toBe(standardVat(full));
    }
  });

  it("standardVat rounds half away from zero, so a negative line mirrors the positive one", () => {
    for (const x of [1, 2, 3, 4, 5, 6, 7, 99, 12_345, 33_333]) {
      expect(standardVat(-x)).toBe(-standardVat(x));
    }
  });
});

describe("deposit balance and application", () => {
  it("is full until applied, zero once applied, restored when the application is reversed", () => {
    expect(depositRemaining({ depositTotal: 50_000, appliedLines: [], returnLines: [] })).toBe(50_000);
    expect(depositRemaining({ depositTotal: 50_000, appliedLines: [-50_000], returnLines: [] })).toBe(0);
    // credit note on the pickup sale: the reversal line is positive
    expect(depositRemaining({ depositTotal: 50_000, appliedLines: [-50_000, 50_000], returnLines: [] })).toBe(50_000);
  });

  it("a returned deposit has nothing left to apply", () => {
    expect(depositRemaining({ depositTotal: 50_000, appliedLines: [], returnLines: [-50_000] })).toBe(0);
  });

  it("never applies the same deposit twice: once consumed, the plan skips it", () => {
    const open = [{ id: "d1", remainingOere: 50_000, paidAt: "2026-09-18T10:00:00Z" }];
    expect(planDepositApplication(open, 169_800)).toEqual([{ depositItemId: "d1", amountOere: 50_000 }]);
    const consumed = [
      { id: "d1", remainingOere: depositRemaining({ depositTotal: 50_000, appliedLines: [-50_000], returnLines: [] }) },
    ];
    expect(planDepositApplication(consumed, 169_800)).toEqual([]);
    expect(canApplyDeposit(0, 1)).toBe(false);
  });

  it("applies oldest first, up to the price, and never more than the balance", () => {
    const plan = planDepositApplication(
      [
        { id: "b", remainingOere: 30_000, paidAt: "2026-09-20T00:00:00Z" },
        { id: "a", remainingOere: 50_000, paidAt: "2026-09-10T00:00:00Z" },
      ],
      60_000,
    );
    expect(plan).toEqual([
      { depositItemId: "a", amountOere: 50_000 },
      { depositItemId: "b", amountOere: 10_000 },
    ]);
  });

  it("a deposit larger than the price is applied up to the price (the total never goes negative)", () => {
    expect(planDepositApplication([{ id: "a", remainingOere: 80_000 }], 50_000)).toEqual([
      { depositItemId: "a", amountOere: 50_000 },
    ]);
    expect(planDepositApplication([{ id: "a", remainingOere: 80_000 }], 0)).toEqual([]);
  });

  it("canApplyDeposit enforces whole, positive amounts within the balance", () => {
    expect(canApplyDeposit(50_000, 50_000)).toBe(true);
    expect(canApplyDeposit(50_000, 50_001)).toBe(false);
    expect(canApplyDeposit(50_000, 0)).toBe(false);
    expect(canApplyDeposit(50_000, 12.5)).toBe(false);
  });
});

describe("returning deposits", () => {
  const dep: OriginalLine = {
    id: "dep",
    itemType: "deposit",
    deviceId: null,
    skuProductId: null,
    description: "Depositum",
    quantity: 1,
    unitPrice: 50_000,
    totalPrice: 50_000,
    discountAmount: 0,
    vatAmount: 10_000,
    vatScheme: "regular",
    purchasePrice: null,
    depositRemaining: 50_000,
  };

  it("refunds an unapplied deposit with its VAT", () => {
    const note = buildCreditNote([dep], {}, [{ orderItemId: "dep", quantity: 1, restock: false }]);
    expect(note.refundAmount).toBe(50_000);
    expect(note.vatTotal).toBe(-10_000);
  });

  it("refuses to refund a deposit that was applied to a case payment", () => {
    expect(() =>
      buildCreditNote([{ ...dep, depositRemaining: 0 }], {}, [{ orderItemId: "dep", quantity: 1, restock: false }]),
    ).toThrow(CreditNoteError);
  });

  const repair: OriginalLine = {
    ...dep,
    id: "rs",
    itemType: "repair_service",
    unitPrice: 169_800,
    totalPrice: 169_800,
    vatAmount: 33_960,
    depositRemaining: null,
  };
  const applied: OriginalLine = {
    ...dep,
    id: "da",
    itemType: "deposit_applied",
    unitPrice: -50_000,
    totalPrice: -50_000,
    vatAmount: -10_000,
    depositRemaining: null,
  };

  it("returns the repair line and the applied deposit together: the customer gets back what they paid at pickup", () => {
    const note = buildCreditNote([repair, applied], {}, [
      { orderItemId: "rs", quantity: 1, restock: false },
      { orderItemId: "da", quantity: 1, restock: false },
    ]);
    expect(note.refundAmount).toBe(119_800);
  });

  it("refuses to return one without the other", () => {
    expect(() => buildCreditNote([repair, applied], {}, [{ orderItemId: "rs", quantity: 1, restock: false }])).toThrow(
      /sammen/,
    );
    expect(() => buildCreditNote([repair, applied], {}, [{ orderItemId: "da", quantity: 1, restock: false }])).toThrow(
      /sammen/,
    );
  });
});

describe("daily summary: Depositum modtaget / modregnet", () => {
  const base = {
    discount_amount: 0,
    discount_reason: null,
    brugtmoms_total: 0,
    payment_method: null,
    register_id: "r1",
  };
  const depositOrder: SummaryOrder = {
    ...base,
    id: "o1",
    order_number: "O1",
    receipt_number: "V1-000001",
    receipt_no: 1,
    type: "pos",
    total: 50_000,
    vat_total: 10_000,
    confirmed_at: "2026-09-18T10:00:00Z",
    order_items: [
      { item_type: "deposit", quantity: 1, total_price: 50_000, discount_amount: 0, vat_scheme: "regular", vat_amount: 10_000 },
    ],
    order_payments: [{ type: "kort_terminal", amount_oere: 50_000 }],
  };
  const pickupOrder: SummaryOrder = {
    ...base,
    id: "o2",
    order_number: "O2",
    receipt_number: "V1-000042",
    receipt_no: 42,
    type: "pos",
    total: 119_800,
    vat_total: 23_960,
    confirmed_at: "2026-10-04T10:00:00Z",
    order_items: [
      { item_type: "repair_service", quantity: 1, total_price: 169_800, discount_amount: 0, vat_scheme: "regular", vat_amount: 33_960 },
      { item_type: "deposit_applied", quantity: 1, total_price: -50_000, discount_amount: 0, vat_scheme: "regular", vat_amount: -10_000 },
    ],
    order_payments: [{ type: "kontant", amount_oere: 119_800 }],
  };

  it("reports received and applied deposits as separate figures", () => {
    const a = aggregateDailySummary([depositOrder], [], { date: "2026-09-18" });
    expect(a.deposits).toEqual({ received: 50_000, receivedVat: 10_000, applied: 0, appliedVat: 0 });
    const b = aggregateDailySummary([pickupOrder], [], { date: "2026-10-04" });
    expect(b.deposits).toEqual({ received: 0, receivedVat: 0, applied: 50_000, appliedVat: 10_000 });
  });

  it("the Dinero journal balances and lists both deposit lines", () => {
    const days: Array<[SummaryOrder[], string]> = [
      [[depositOrder], "2026-09-18"],
      [[pickupOrder], "2026-10-04"],
      [[depositOrder, pickupOrder], "2026-10-04"],
    ];
    for (const [orders, date] of days) {
      const rows = buildJournalRows(aggregateDailySummary(orders, [], { date }));
      expect(rows.reduce((s, r) => s + r.debit, 0)).toBe(rows.reduce((s, r) => s + r.credit, 0));
    }
    const day1 = buildJournalRows(aggregateDailySummary([depositOrder], [], { date: "2026-09-18" }));
    expect(day1.find((r) => r.text.startsWith("Depositum modtaget"))).toMatchObject({ credit: 40_000, debit: 0 });
    // a deposit is not revenue yet
    expect(day1.find((r) => r.text.startsWith("Omsætning"))).toBeUndefined();
    const day2 = buildJournalRows(aggregateDailySummary([pickupOrder], [], { date: "2026-10-04" }));
    expect(day2.find((r) => r.text.startsWith("Depositum modregnet"))).toMatchObject({ debit: 40_000, credit: 0 });
    // revenue at pickup is the full price ex VAT: 1.698 / 1,25 = 1.358,40
    expect(day2.find((r) => r.text.startsWith("Omsætning"))?.credit).toBe(135_840);
  });
});
