import { describe, it, expect } from "vitest";
import {
  activeCaseTicketId,
  cartTotals,
  caseBlockedReason,
  casePaymentLines,
  checkPayments,
  discountableBase,
  parseKasseParams,
  paymentsNeedCustomer,
  planAppliedDeposits,
  resolvePayments,
  toSaleItems,
  usesCardTerminal,
  validateDeposit,
  type CartLine,
  type CaseContext,
  type PaymentChoice,
} from "../kasse-logic";
import { parseCaseReference } from "../case-lookup";
import { saleBodySchema } from "../schemas";
import { rankTopSellers } from "../quick-tiles";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function ctx(over: Partial<CaseContext> = {}): CaseContext {
  return {
    id: U(1),
    ticketNumber: "PS-2026-1189",
    paid: false,
    customer: { id: U(2), name: "Anders Hansen", phone: "12345678", email: "a@example.dk" },
    deviceLabel: "OnePlus Nord 3",
    totalOere: 169_800,
    description: "Sag PS-2026-1189 · OnePlus Nord 3 · Skærm, bagglas",
    deposits: [{ id: U(10), amount_oere: 50_000, paid_at: "2026-09-18T10:00:00Z", remaining_oere: 50_000 }],
    depositsOk: true,
    ...over,
  };
}

const glass: CartLine = {
  key: "g",
  type: "sku_product",
  skuProductId: U(20),
  name: "Beskyttelsesglas",
  price: 9_900,
  quantity: 1,
};

describe("?sag preload (Hent sag til betaling)", () => {
  it("reads ?sag and ?depositum from the URL", () => {
    expect(parseKasseParams(new URLSearchParams(`sag=${U(1)}`))).toEqual({ caseId: U(1), openDeposit: false });
    expect(parseKasseParams(new URLSearchParams(`sag=${U(1)}&depositum=1`))).toEqual({ caseId: U(1), openDeposit: true });
    // depositum without a case, or garbage, never triggers a lookup
    expect(parseKasseParams(new URLSearchParams("depositum=1"))).toEqual({ caseId: null, openDeposit: false });
    expect(parseKasseParams(new URLSearchParams("sag=%3Cscript%3E"))).toEqual({ caseId: null, openDeposit: false });
    expect(parseKasseParams(new URLSearchParams(""))).toEqual({ caseId: null, openDeposit: false });
  });

  it("builds one repair line with the case total and the case's ticket id", () => {
    const lines = casePaymentLines(ctx());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ type: "repair_service", ticketId: U(1), ticketNumber: "PS-2026-1189", price: 169_800 });
    expect(activeCaseTicketId(lines)).toBe(U(1));
  });

  it("deducts the deposit as a derived line and matches the design example (1.297,00 kr.)", () => {
    const c = ctx();
    const lines = [...casePaymentLines(c), glass];
    const applied = planAppliedDeposits(lines, c, 0);
    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({ depositItemId: U(10), price: 50_000, ticketId: U(1) });
    const t = cartTotals(lines, applied, 0);
    expect(t.subtotal).toBe(169_800 + 9_900 - 50_000);
    expect(t.total).toBe(129_700);
    expect(t.vat).toBe(25_940);
    expect(t.appliedTotal).toBe(50_000);
  });

  it("sends repair_service + deposit_applied lines that the sale schema accepts", () => {
    const c = ctx();
    const lines = [...casePaymentLines(c), glass];
    const items = toSaleItems(lines, planAppliedDeposits(lines, c, 0));
    expect(items).toEqual([
      { type: "repair_service", repairTicketId: U(1), description: c.description, unitPriceOere: 169_800 },
      { type: "sku_product", skuProductId: U(20), quantity: 1 },
      { type: "deposit_applied", depositItemId: U(10), amountOere: 50_000 },
    ]);
    const body = {
      items,
      payments: [{ type: "kort_terminal", amountOere: 129_700 }],
      locationId: U(30),
      registerId: U(31),
    };
    expect(saleBodySchema.safeParse(body).success).toBe(true);
  });

  it("does not deduct a consumed deposit, nor when deposits could not be read", () => {
    const lines = casePaymentLines(ctx());
    expect(planAppliedDeposits(lines, ctx({ deposits: [{ id: U(10), amount_oere: 50_000, paid_at: "x", remaining_oere: 0 }] }), 0)).toEqual([]);
    expect(planAppliedDeposits(lines, ctx({ depositsOk: false }), 0)).toEqual([]);
    expect(caseBlockedReason(ctx({ depositsOk: false }), "payment")).toMatch(/Depositum kunne ikke hentes/);
  });

  it("never lets the total go below zero: a discount shrinks the deduction", () => {
    const c = ctx({ totalOere: 40_000 });
    const lines = casePaymentLines(c);
    const applied = planAppliedDeposits(lines, c, 10_000);
    expect(applied[0].price).toBe(30_000);
    expect(cartTotals(lines, applied, 10_000).total).toBe(0);
  });

  it("a deposit above the price is deducted only up to the price", () => {
    const c = ctx({ totalOere: 30_000 });
    const applied = planAppliedDeposits(casePaymentLines(c), c, 0);
    expect(applied[0].price).toBe(30_000);
  });

  it("deduction needs the repair line: removing it drops the deposit lines", () => {
    expect(planAppliedDeposits([glass], ctx(), 0)).toEqual([]);
  });

  it("refuses a case that is already paid", () => {
    expect(caseBlockedReason(ctx({ paid: true }), "payment")).toMatch(/allerede betalt/);
    expect(caseBlockedReason(ctx({ paid: true }), "deposit")).toMatch(/allerede betalt/);
    expect(caseBlockedReason(ctx(), "payment")).toBeNull();
  });
});

describe("deposit dialog validation", () => {
  it("needs a positive amount and an unpaid case", () => {
    expect(validateDeposit(null, ctx()).ok).toBe(false);
    expect(validateDeposit(0, ctx()).ok).toBe(false);
    expect(validateDeposit(50_000, ctx({ paid: true })).ok).toBe(false);
    expect(validateDeposit(50_000, ctx()).ok).toBe(true);
  });

  it("warns, but allows, a deposit larger than the case price", () => {
    const v = validateDeposit(200_000, ctx({ deposits: [] }));
    expect(v.ok).toBe(true);
    expect(v.warning).toMatch(/større end sagens pris/);
    expect(validateDeposit(50_000, ctx({ deposits: [] })).warning).toBeNull();
  });

  it("a deposit-only sale is a single deposit line naming the case", () => {
    const items = toSaleItems(
      [{ key: "d", type: "deposit", ticketId: U(1), ticketNumber: "PS-2026-1189", name: "Depositum · sag PS-2026-1189", price: 50_000 }],
      [],
    );
    expect(items).toEqual([{ type: "deposit", repairTicketId: U(1), description: "Depositum · sag PS-2026-1189", unitPriceOere: 50_000 }]);
    // without the case the schema rejects it
    expect(
      saleBodySchema.safeParse({
        items: [{ type: "deposit", unitPriceOere: 50_000 }],
        payments: [{ type: "kontant", amountOere: 50_000 }],
        locationId: U(30),
        registerId: U(31),
      }).success,
    ).toBe(false);
  });
});

describe("totals and discount", () => {
  it("deposit lines are not discountable", () => {
    const lines: CartLine[] = [
      { key: "d", type: "deposit", ticketId: U(1), ticketNumber: "X", name: "Depositum", price: 50_000 },
      glass,
    ];
    expect(discountableBase(lines)).toBe(9_900);
  });

  it("discount comes off the repair price before the deposit is deducted", () => {
    const c = ctx();
    const lines = casePaymentLines(c);
    const applied = planAppliedDeposits(lines, c, 10_000);
    const t = cartTotals(lines, applied, 10_000);
    expect(t.total).toBe(169_800 - 10_000 - 50_000);
  });
});

describe("payments", () => {
  it("a single method follows the total", () => {
    expect(resolvePayments({ kind: "single", type: "kontant" }, 129_700)).toEqual([{ type: "kontant", amountOere: 129_700 }]);
    expect(checkPayments({ kind: "single", type: "mobilepay" }, 129_700).ok).toBe(true);
  });

  it("a zero total takes no payment (deposit covers everything)", () => {
    expect(resolvePayments({ kind: "single", type: "kontant" }, 0)).toEqual([]);
    expect(checkPayments({ kind: "single", type: "kontant" }, 0).ok).toBe(true);
  });

  it("split payment must sum to exactly the total", () => {
    const split = (a: number, b: number): PaymentChoice => ({
      kind: "split",
      lines: [
        { type: "kontant", amountOere: a },
        { type: "kort_terminal", amountOere: b },
      ],
    });
    expect(checkPayments(split(50_000, 79_700), 129_700).ok).toBe(true);
    const short = checkPayments(split(50_000, 79_600), 129_700);
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.code).toBe("payment_mismatch");
    const over = checkPayments(split(50_000, 80_000), 129_700);
    expect(over.ok).toBe(false);
  });

  it("split lines need positive amounts, and gift card / voucher lines need a reference", () => {
    const bad = checkPayments({ kind: "split", lines: [{ type: "kontant", amountOere: 0 }, { type: "kort_terminal", amountOere: 100 }] }, 100);
    expect(bad.ok).toBe(false);
    const noRef = checkPayments({ kind: "split", lines: [{ type: "gavekort", amountOere: 100 }] }, 100);
    expect(noRef.ok).toBe(false);
    if (!noRef.ok) expect(noRef.code).toBe("payment_reference_required");
    expect(checkPayments({ kind: "split", lines: [{ type: "gavekort", amountOere: 100, reference: "GK-1" }] }, 100).ok).toBe(true);
  });

  it("flags card-terminal lines (manual approval step) and invoice lines (customer required)", () => {
    expect(usesCardTerminal([{ type: "kontant", amountOere: 1 }, { type: "kort_terminal", amountOere: 1 }])).toBe(true);
    expect(usesCardTerminal([{ type: "mobilepay", amountOere: 1 }])).toBe(false);
    expect(paymentsNeedCustomer([{ type: "faktura", amountOere: 1 }])).toBe(true);
    expect(paymentsNeedCustomer([{ type: "klarna", amountOere: 1 }])).toBe(false);
  });
});

describe("scan input", () => {
  it("recognises case references typed or scanned, and leaves product codes alone", () => {
    expect(parseCaseReference("PS-2026-0123")).toEqual({ kind: "number", value: "PS-2026-0123" });
    expect(parseCaseReference("ps-2026-123")).toEqual({ kind: "number", value: "PS-2026-0123" });
    expect(parseCaseReference("#1189")).toEqual({ kind: "digits", value: "1189" });
    expect(parseCaseReference("sag 42")).toEqual({ kind: "digits", value: "0042" });
    expect(parseCaseReference(U(1))).toEqual({ kind: "id", value: U(1) });
    // EAN / IMEI / titles are never mistaken for a case
    expect(parseCaseReference("5901234123457")).toBeNull();
    expect(parseCaseReference("356938035643809")).toBeNull();
    expect(parseCaseReference("USB-C kabel")).toBeNull();
    expect(parseCaseReference("")).toBeNull();
  });
});

describe("quick tiles", () => {
  it("ranks products by units sold and ignores returns and non-products", () => {
    const rows = [
      { sku_product_id: "a", quantity: 2 },
      { sku_product_id: "b", quantity: 5 },
      { sku_product_id: "a", quantity: 4 },
      { sku_product_id: null, quantity: 9 },
      { sku_product_id: "c", quantity: -1 },
    ];
    expect(rankTopSellers(rows, 2)).toEqual([
      { id: "a", sold: 6 },
      { id: "b", sold: 5 },
    ]);
  });
});
