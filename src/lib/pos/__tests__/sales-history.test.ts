import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/auth/store-scope-server", () => ({ applyLocationScope: (b: unknown) => b }));

import {
  buildQuery,
  itemsSummary,
  paymentSummary,
  parseSalesFilters,
  periodRange,
  refundState,
  returUrl,
  sanitizeSearch,
  totalsFor,
  webshopOrderType,
} from "../sales-history";
import { shapeSaleRows, type RawSale, type SaleExtras } from "../sales-history-data";

// Wednesday 2026-10-14, 12:00 Copenhagen (CEST)
const NOW = new Date("2026-10-14T10:00:00Z");

describe("parseSalesFilters", () => {
  it("defaults to today without params", () => {
    expect(parseSalesFilters({}, NOW)).toEqual({ period: "i-dag", from: "", to: "", payment: "", q: "", page: 1 });
  });

  it("validates custom range, swaps reversed dates and falls back to today", () => {
    const f = parseSalesFilters({ periode: "periode", fra: "2026-10-10", til: "2026-10-05" }, NOW);
    expect([f.from, f.to]).toEqual(["2026-10-05", "2026-10-10"]);
    const bad = parseSalesFilters({ periode: "periode", fra: "nonsense" }, NOW);
    expect([bad.from, bad.to]).toEqual(["2026-10-14", "2026-10-14"]);
  });

  it("ignores unknown payment methods and bad page numbers", () => {
    const f = parseSalesFilters({ betaling: "bitcoin", side: "-3", q: "  V1-0001 " }, NOW);
    expect(f.payment).toBe("");
    expect(f.page).toBe(1);
    expect(f.q).toBe("V1-0001");
    expect(parseSalesFilters({ betaling: "mobilepay" }, NOW).payment).toBe("mobilepay");
  });
});

describe("periodRange", () => {
  it("covers the Copenhagen day for today", () => {
    const r = periodRange({ period: "i-dag", from: "", to: "" }, NOW);
    expect(r.startIso).toBe("2026-10-13T22:00:00.000Z");
    expect(r.endIso).toBe("2026-10-14T22:00:00.000Z");
  });

  it("yesterday and week (from Monday)", () => {
    expect(periodRange({ period: "i-gaar", from: "", to: "" }, NOW).fromDate).toBe("2026-10-13");
    const w = periodRange({ period: "uge", from: "", to: "" }, NOW);
    expect([w.fromDate, w.toDate]).toEqual(["2026-10-12", "2026-10-14"]);
  });

  it("includes the whole last day of a custom range", () => {
    const r = periodRange({ period: "periode", from: "2026-10-01", to: "2026-10-02" }, NOW);
    expect(r.endIso).toBe("2026-10-02T22:00:00.000Z");
  });
});

describe("summaries", () => {
  it("lists payment methods with Danish labels and ignores negative refunds", () => {
    expect(paymentSummary([{ type: "kontant", amount_oere: 5000 }, { type: "mobilepay", amount_oere: 1000 }])).toBe("Kontant, MobilePay");
    expect(paymentSummary([{ type: "kort_terminal", amount_oere: 100 }, { type: "kort_terminal", amount_oere: 200 }])).toBe("Kort (terminal)");
    expect(paymentSummary([], "cash")).toBe("Kontant");
    expect(paymentSummary([])).toBe("—");
  });

  it("shortens the item list", () => {
    const items = [
      { item_type: "device", quantity: 1, description: "iPhone 13", repair_ticket_id: null },
      { item_type: "sku_product", quantity: 2, description: null, sku_title: "Cover", repair_ticket_id: null },
      { item_type: "repair_service", quantity: 1, description: null, repair_ticket_id: "t" },
    ];
    expect(itemsSummary(items)).toBe("iPhone 13, 2 x Cover +1");
    expect(itemsSummary([])).toBe("—");
  });

  it("refund state", () => {
    expect(refundState(1000, 0)).toBe("ingen");
    expect(refundState(1000, 400)).toBe("delvis");
    expect(refundState(1000, 1000)).toBe("fuld");
  });
});

describe("totalsFor", () => {
  it("sums sales, returns and money per method", () => {
    const t = totalsFor(
      [{ total: 1000 }, { total: 2500 }],
      [{ total: -500 }],
      [
        { type: "kontant", amount_oere: 1000 },
        { type: "mobilepay", amount_oere: 2500 },
        { type: "kontant", amount_oere: 0 },
      ],
    );
    expect(t.count).toBe(2);
    expect(t.total).toBe(3500);
    expect(t.returned).toBe(500);
    expect(t.byPayment).toEqual([
      { label: "Kontant", amount: 1000 },
      { label: "MobilePay", amount: 2500 },
    ]);
  });
});

describe("helpers", () => {
  it("sanitizes PostgREST filter characters", () => {
    expect(sanitizeSearch("a,b(c)%d*")).toBe("a b c d");
  });

  it("builds query strings that round trip", () => {
    const f = parseSalesFilters({ periode: "periode", fra: "2026-10-01", til: "2026-10-02", betaling: "kontant", q: "Hansen" }, NOW);
    expect(buildQuery(f, { page: 2 })).toBe("?periode=periode&fra=2026-10-01&til=2026-10-02&betaling=kontant&q=Hansen&side=2");
    expect(buildQuery(parseSalesFilters({}, NOW))).toBe("");
  });

  it("never lets the webshop list show POS", () => {
    expect(webshopOrderType(undefined)).toBe("online");
    expect(webshopOrderType("pos")).toBe("online");
    expect(webshopOrderType("credit_note")).toBe("online");
    expect(webshopOrderType("draft")).toBe("draft");
  });

  it("links to the return flow with store, register and receipt", () => {
    expect(returUrl({ locationId: "L", registerId: "R", receiptNumber: "V1-000001" })).toBe(
      "/admin/platform/pos/retur?location_id=L&register_id=R&q=V1-000001",
    );
  });
});

describe("shapeSaleRows", () => {
  const sale: RawSale = {
    id: "o1",
    order_number: "V1-000001",
    receipt_number: "V1-000001",
    created_at: "2026-10-14T08:00:00Z",
    confirmed_at: null,
    total: 169800,
    payment_method: null,
    customer_id: "c1",
    staff_id: "s1",
    repair_ticket_id: "t1",
  };
  const extras: SaleExtras = {
    customers: new Map([["c1", { name: " Anders Hansen ", phone: "12345678", email: null }]]),
    staff: new Map([["s1", "Mette"]]),
    tickets: new Map([["t1", "PS-2026-1189"]]),
    items: new Map([["o1", [{ item_type: "repair_service", quantity: 1, description: "Skærm", repair_ticket_id: "t1" }]]]),
    payments: new Map([["o1", [{ type: "kontant", amount_oere: 169800 }]]]),
    refunded: new Map([["o1", 50000]]),
  };

  it("joins customer, case number, payments, staff and refund state", () => {
    const [row] = shapeSaleRows([sale], extras);
    expect(row).toMatchObject({
      orderNumber: "V1-000001",
      customerName: "Anders Hansen",
      caseNumbers: ["PS-2026-1189"],
      payments: "Kontant",
      staffName: "Mette",
      summary: "Skærm",
      refundState: "delvis",
    });
  });

  it("handles a sale without customer or staff", () => {
    const [row] = shapeSaleRows([{ ...sale, customer_id: null, staff_id: null, repair_ticket_id: null }], {
      ...extras,
      items: new Map(),
      refunded: new Map(),
    });
    expect(row.customerName).toBeNull();
    expect(row.staffName).toBeNull();
    expect(row.caseNumbers).toEqual([]);
    expect(row.refundState).toBe("ingen");
  });
});
