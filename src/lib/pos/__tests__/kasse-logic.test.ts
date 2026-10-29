import { describe, it, expect } from "vitest";
import {
  activeCaseTicketId,
  bundleForLines,
  cartTotals,
  caseBlockedReason,
  casePaymentLines,
  caseStockSummary,
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
import { standardVat } from "../calc";
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

describe("lagersalg 3 for 2", () => {
  const lines: CartLine[] = [
    { key: "d", type: "device", deviceId: U(1), name: "iPhone", price: 300000, vatScheme: "brugtmoms" },
    { key: "a", type: "sku_product", skuProductId: U(2), name: "Cover", price: 5900, quantity: 2, lagersalg: true },
    { key: "b", type: "sku_product", skuProductId: U(3), name: "Cover", price: 7900, quantity: 1, lagersalg: true },
    { key: "g", type: "sku_product", skuProductId: U(4), name: "Glas", price: 9900, quantity: 1 },
  ];

  it("trækker 3 for 2 fra lagersalgslinjer og rører ikke enhedens brugtmoms", () => {
    const t = cartTotals(lines, [], 0);
    expect(t.bundleDiscount).toBe(5900);
    expect(t.bundleUnitsToNextFree).toBeNull();
    expect(t.total).toBe(300000 + 11800 + 7900 + 9900 - 5900);
    expect(t.vat).toBe(standardVat(11800 - 5900) + standardVat(7900) + standardVat(9900));
  });

  it("bundleForLines bruger linjens nøgle", () => {
    expect(bundleForLines(lines).byKey).toEqual({ a: { discountOere: 5900, freeUnits: 1 } });
  });

  it("sender bundleDiscountOere pr. sku-linje til salget, gratis enheder som egen linje", () => {
    const items = toSaleItems(lines, []);
    expect(items.filter((i) => i.type === "sku_product" && i.skuProductId === U(2))).toEqual([
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
      { type: "sku_product", skuProductId: U(2), quantity: 1, bundleDiscountOere: 5900 },
    ]);
    expect(items.find((i) => i.type === "sku_product" && i.skuProductId === U(3))).not.toHaveProperty("bundleDiscountOere");
    expect(items.find((i) => i.type === "sku_product" && i.skuProductId === U(4))).not.toHaveProperty("bundleDiscountOere");
  });

  it("en linje der er helt gratis forbliver én linje med hele rabatten", () => {
    const l: CartLine[] = [
      { key: "x", type: "sku_product", skuProductId: U(5), name: "Dyr", price: 9000, quantity: 2, lagersalg: true },
      { key: "y", type: "sku_product", skuProductId: U(6), name: "Billig", price: 1000, quantity: 1, lagersalg: true },
    ];
    expect(toSaleItems(l, [])).toEqual([
      { type: "sku_product", skuProductId: U(5), quantity: 2 },
      { type: "sku_product", skuProductId: U(6), quantity: 1, bundleDiscountOere: 1000 },
    ]);
  });

  it("manuel rabat fordeles på beløbet efter 3 for 2", () => {
    const t = cartTotals(lines, [], 1000);
    expect(t.discount).toBe(1000);
    expect(t.bundleDiscount).toBe(5900);
    expect(t.total).toBe(300000 + 11800 + 7900 + 9900 - 5900 - 1000);
  });

  it("rabatloftet er beløbet efter 3 for 2", () => {
    expect(discountableBase(lines)).toBe(300000 + 11800 + 7900 + 9900 - 5900);
  });

  it("viser hvor mange lagersalgsvarer der mangler til næste gratis", () => {
    const l: CartLine[] = [{ key: "a", type: "sku_product", skuProductId: U(2), name: "Cover", price: 5900, quantity: 2, lagersalg: true }];
    expect(cartTotals(l, [], 0).bundleUnitsToNextFree).toBe(1);
    expect(cartTotals(l, [], 0).bundleDiscount).toBe(0);
  });

  it("varer solgt fra en reparationssag indgår aldrig i 3 for 2", () => {
    const l: CartLine[] = [
      { key: "a", type: "sku_product", skuProductId: U(2), name: "Cover", price: 5900, quantity: 2, lagersalg: true },
      { key: "r", type: "sku_product", skuProductId: U(3), name: "Cover", price: 4900, quantity: 1, lagersalg: true, repairTicketItemId: U(9) },
    ];
    expect(cartTotals(l, [], 0).bundleDiscount).toBe(0);
    expect(toSaleItems(l, [])).toEqual([
      { type: "sku_product", skuProductId: U(2), quantity: 2 },
      { type: "sku_product", skuProductId: U(3), quantity: 1, repairTicketItemId: U(9) },
    ]);
  });

  it("depositum-modregning holder totalen på 0 eller derover efter 3 for 2 og fuld rabat", () => {
    const c = ctx();
    const l: CartLine[] = [
      ...casePaymentLines(c),
      { key: "a", type: "sku_product", skuProductId: U(2), name: "Cover", price: 5900, quantity: 3, lagersalg: true },
    ];
    const max = discountableBase(l);
    expect(max).toBe(169_800 + 11_800);
    const applied = planAppliedDeposits(l, c, max);
    const t = cartTotals(l, applied, max);
    expect(t.total).toBe(0);
  });

  it("salgsskemaet accepterer bundleDiscountOere", () => {
    const parsed = saleBodySchema.safeParse({
      items: toSaleItems(lines, []),
      payments: [],
      locationId: U(30),
      registerId: U(31),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toContainEqual({ type: "sku_product", skuProductId: U(2), quantity: 1, bundleDiscountOere: 5900 });
    }
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

describe("case own lines and stock status", () => {
  const item = (over: Record<string, unknown>) => ({
    id: "i",
    item_id: "i",
    name: "Del",
    qty: 1,
    unit_oere: 0,
    total_oere: 0,
    kind: "part" as const,
    ...over,
  });

  it("puts a device and a product from the case on their own cart lines, not in the repair line", () => {
    const c = ctx({
      totalOere: 100_000 + 500_000 + 9_900,
      lines: [
        item({ id: "r", item_id: "r", name: "Skærmskift", kind: "repair", unit_oere: 100_000, total_oere: 100_000 }),
        item({ id: "d", item_id: "d", name: "iPhone 13", kind: "device", device_id: U(40), unit_oere: 500_000, total_oere: 500_000, vat_scheme: "brugtmoms" }),
        item({ id: "p", item_id: "p", name: "Cover", kind: "product", sku_product_id: U(41), unit_oere: 9_900, total_oere: 9_900 }),
      ],
    });
    const lines = casePaymentLines(c);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ type: "repair_service", price: 100_000 });
    expect(lines[1]).toMatchObject({ type: "device", deviceId: U(40), price: 500_000, repairTicketItemId: "d" });
    expect(lines[2]).toMatchObject({ type: "sku_product", skuProductId: U(41), price: 9_900, repairTicketItemId: "p" });
  });

  it("lists stock status per stock-carrying line and suggests a deposit on backorder without deposit", () => {
    const c = ctx({
      deposits: [],
      lines: [
        item({ id: "r", item_id: "r", name: "Skærmskift", kind: "repair", stock_status: "none" }),
        item({ id: "a", item_id: "a", name: "Skærm", kind: "part", stock_status: "backorder" }),
        item({ id: "b", item_id: "b", name: "Batteri", kind: "part", stock_status: "reserved" }),
        item({ id: "c", item_id: "c", name: "Cover", kind: "product", stock_status: "none" }),
      ],
    });
    const s = caseStockSummary(c);
    expect(s.rows.map((r) => [r.name, r.label])).toEqual([
      ["Skærm", "Skal bestilles"],
      ["Batteri", "Reserveret"],
      ["Cover", "Ingen reservation"],
    ]);
    expect(s.hasBackorder).toBe(true);
    expect(s.suggestDeposit).toBe(true);
  });

  it("no deposit hint when a deposit exists, nothing is on backorder, or the case is paid", () => {
    const back = [item({ id: "a", item_id: "a", kind: "part", stock_status: "backorder" })];
    expect(caseStockSummary(ctx({ lines: back })).suggestDeposit).toBe(false); // ctx() has a deposit
    expect(caseStockSummary(ctx({ deposits: [], paid: true, lines: back })).suggestDeposit).toBe(false);
    expect(caseStockSummary(ctx({ deposits: [], lines: [item({ stock_status: "reserved" })] })).suggestDeposit).toBe(false);
  });
});
