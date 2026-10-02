import { describe, it, expect } from "vitest";
import { aggregateDailySummary, type SummaryOrder, type SummarySession } from "../daily-summary";
import { buildJournalRows, summaryToCsv } from "../summary-csv";

const base = {
  discount_amount: 0,
  discount_reason: null,
  vat_total: 0,
  brugtmoms_total: 0,
  payment_method: null,
  register_id: "r1",
  confirmed_at: "2026-10-01T10:00:00.000Z",
};

const orders: SummaryOrder[] = [
  {
    ...base,
    id: "s1",
    order_number: "PSP-1",
    receipt_number: "V1-000001",
    receipt_no: 1,
    type: "pos",
    total: 90000,
    discount_amount: 10000,
    discount_reason: "Tilbud",
    brugtmoms_total: 2000,
    order_items: [{ item_type: "device", quantity: 1, total_price: 100000, discount_amount: 10000, vat_scheme: "brugtmoms" }],
    order_payments: [
      { type: "kontant", amount_oere: 50000 },
      { type: "kort_terminal", amount_oere: 40000 },
    ],
  },
  {
    ...base,
    id: "s2",
    order_number: "PSP-2",
    receipt_number: "V1-000002",
    receipt_no: 2,
    type: "pos",
    total: 25000,
    vat_total: 5000,
    order_items: [{ item_type: "sku_product", quantity: 1, total_price: 25000, discount_amount: 0, vat_scheme: "regular" }],
    order_payments: [{ type: "mobilepay", amount_oere: 25000 }],
  },
  {
    ...base,
    id: "c1",
    order_number: "PSP-3",
    receipt_number: "V1-000003",
    receipt_no: 3,
    type: "credit_note",
    total: -25000,
    vat_total: -5000,
    order_items: [{ item_type: "sku_product", quantity: -1, total_price: -25000, discount_amount: 0, vat_scheme: "regular" }],
    order_payments: [{ type: "kontant", amount_oere: -25000 }],
  },
  {
    // Legacy sale from before order_payments: falls back to payment_method.
    ...base,
    id: "old",
    order_number: "PSP-OLD",
    receipt_number: null,
    receipt_no: null,
    register_id: null,
    type: "pos",
    total: 10000,
    payment_method: "card",
    order_items: [{ item_type: "sku_product", quantity: 1, total_price: 10000, discount_amount: 0, vat_scheme: "regular" }],
    order_payments: [],
  },
];

const sessions: SummarySession[] = [
  {
    id: "se1",
    registerId: "r1",
    openedAt: "2026-10-01T06:00:00.000Z",
    closedAt: "2026-10-01T16:00:00.000Z",
    openingFloat: 50000,
    countedCash: 74000,
    expectedCash: 75000,
    difference: -1000,
    cashToBank: 60000,
    expenses: [{ description: "Kaffe", amountOere: 2000 }],
    locked: true,
    adjustments: [500],
  },
];

const meta = { date: "2026-10-01", registerId: "r1", registerName: "Kasse 1" };

describe("aggregateDailySummary", () => {
  const s = aggregateDailySummary(orders, sessions, meta);

  it("totals sales, refunds, net and discount by reason", () => {
    expect(s.salesCount).toBe(3);
    expect(s.creditCount).toBe(1);
    expect(s.grossSales).toBe(125000);
    expect(s.refunds).toBe(25000);
    expect(s.netTotal).toBe(100000);
    expect(s.discountTotal).toBe(10000);
    expect(s.discountByReason).toEqual({ Tilbud: 10000 });
  });

  it("nets payments per type with received/refunded and handles legacy sales", () => {
    const by = Object.fromEntries(s.payments.map((p) => [p.type, p]));
    expect(by.kontant).toMatchObject({ received: 50000, refunded: 25000, net: 25000 });
    expect(by.kort_terminal.net).toBe(50000); // 40000 split + 10000 legacy card
    expect(by.mobilepay.net).toBe(25000);
    expect(s.payments.reduce((a, p) => a + p.net, 0)).toBe(s.netTotal);
  });

  it("separates standard VAT and brugtmoms (credit notes subtract)", () => {
    expect(s.vatStandard).toBe(0);
    expect(s.brugtmoms).toBe(2000);
    expect(s.brugtGross).toBe(90000);
    expect(s.regularGross).toBe(10000);
  });

  it("reports the receipt number range and counts legacy documents", () => {
    expect(s.receiptRange).toEqual({ first: "V1-000001", last: "V1-000003", count: 3 });
    expect(s.legacyOrderCount).toBe(1);
  });

  it("counts net device and accessory quantities", () => {
    expect(s.deviceCount).toBe(1);
    expect(s.skuCount).toBe(1); // 1 + 1 - 1
  });

  it("adds later adjustment rows to the locked difference", () => {
    expect(s.cash.sessionsClosed).toBe(1);
    expect(s.cash.difference).toBe(-500);
    expect(s.cash.expensesTotal).toBe(2000);
    expect(s.cash.cashToBank).toBe(60000);
  });
});

describe("Dinero journal CSV", () => {
  const s = aggregateDailySummary(orders, sessions, meta);

  it("balances debit and credit", () => {
    const rows = buildJournalRows(s);
    const debit = rows.reduce((a, r) => a + r.debit, 0);
    const credit = rows.reduce((a, r) => a + r.credit, 0);
    expect(debit).toBe(credit);
    expect(debit).toBeGreaterThan(0);
  });

  it("uses placeholder accounts and a clean header row with a BOM", () => {
    const csv = summaryToCsv(s);
    expect(csv.startsWith("﻿Dato;Kasse;Tekst;Konto;Debet;Kredit")).toBe(true);
    expect(csv).toContain("[KONTO-KASSEBEHOLDNING]");
    expect(csv).toContain("[KONTO-BRUGT-SALG]");
    expect(csv).toContain("[KONTO-KASSEDIFFERENCE]");
    expect(csv).toContain("V1-000001 til V1-000003");
  });

  it("flips a negative net payment to the credit side", () => {
    const refundOnly = aggregateDailySummary([orders[2]], [], meta);
    const cash = buildJournalRows(refundOnly).find((r) => r.account === "[KONTO-KASSEBEHOLDNING]");
    expect(cash).toMatchObject({ debit: 0, credit: 25000 });
  });
});
