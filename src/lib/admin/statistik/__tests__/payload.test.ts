import { describe, expect, it } from "vitest";
import type { OverviewOrder } from "@/lib/admin/overview/kpi";
import type { ScopeSlug } from "@/lib/auth/store-scope";
import type { StatViewer } from "../access";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { buildPayload, prevBuckets, stripForViewer, type BuildInput, type StatPayload } from "../payload";
import { statRange } from "../range";

const NOW = new Date("2026-11-18T12:00:00Z");
const LOC: Record<string, ScopeSlug> = { "loc-vejle": "vejle", "loc-slagelse": "slagelse", "loc-web": "webshop" };
const slugOf = (id: string | null | undefined) => (id ? LOC[id] ?? null : null);

const OWNER: StatViewer = { isOwner: true, scope: "alle", canExport: true };
const STAFF_VIEWER: StatViewer = { isOwner: false, scope: "vejle", canExport: false };

function pos(id: string, at: string, over: Partial<OverviewOrder> = {}): OverviewOrder {
  return {
    id,
    type: "pos",
    total: 10000,
    vat_total: 2000,
    brugtmoms_total: 0,
    location_id: "loc-vejle",
    confirmed_at: at,
    staff_id: "s1",
    order_items: [
      { item_type: "sku_product", sku_product_id: "sku-1", name: "Cover", quantity: 1, total_price: 10000, vat_amount: 2000, purchase_price: 3000 },
    ],
    ...over,
  };
}

const ORDERS: OverviewOrder[] = [
  pos("o1", "2026-11-10T10:00:00Z"),
  {
    id: "o2",
    type: "online",
    total: 404900,
    vat_total: 0,
    brugtmoms_total: 20000,
    location_id: null,
    confirmed_at: "2026-11-11T12:00:00Z",
    shipping_method: "gls",
    shipping_cost: 4900,
    payment_method: "stripe",
    order_items: [
      { item_type: "device", device_id: "d1", name: "iPhone 14", quantity: 1, total_price: 400000, vat_amount: 0, vat_scheme: "brugtmoms", purchase_price: 300000 },
    ],
  },
  {
    type: "repair_prepaid",
    total: 80000,
    vat_total: 16000,
    brugtmoms_total: 0,
    location_id: "loc-slagelse",
    confirmed_at: "2026-11-12T09:00:00Z",
    order_items: [
      { item_type: "repair", repair_ticket_id: "t1", quantity: 1, total_price: 80000, vat_amount: 16000, vat_scheme: "regular", purchase_price: 20000 },
    ],
  },
  pos("o3", "2026-11-12T11:00:00Z", {
    type: "credit_note",
    total: -10000,
    vat_total: -2000,
    original_order_id: "o1",
    order_items: [
      { item_type: "sku_product", sku_product_id: "sku-1", name: "Cover", quantity: -1, total_price: -10000, vat_amount: -2000, purchase_price: 3000 },
    ],
  }),
];

function input(over: Partial<BuildInput> = {}): BuildInput {
  return {
    now: NOW,
    range: statRange({ from: "2026-11-10", to: "2026-11-12" }, NOW),
    minDate: "2026-03-02",
    locationSlugs: ["vejle", "slagelse", "webshop"],
    slugOf,
    orders: ORDERS,
    prevOrders: [pos("p1", "2026-11-08T10:00:00Z", { total: 5000, vat_total: 1000, order_items: [
      { item_type: "sku_product", sku_product_id: "sku-2", name: "Kabel", quantity: 1, total_price: 5000, vat_amount: 1000, purchase_price: 1000 },
    ] })],
    nowOrders: [pos("n1", "2026-11-18T09:00:00Z"), pos("n0", "2026-11-17T09:00:00Z", { total: 5000, vat_total: 1000 })],
    originalStreamByOrderId: new Map([["o1", "kasse"]]),
    tickets: [{ id: "t1", assigned_to: "Mikkel", service_type: "screen", services: [{ name: "Skærmskift" }] }],
    staff: [{ id: "s1", name: "Mikkel", is_active: true, location_id: "loc-vejle" }],
    payments: [{ order_id: "o1", type: "kort_terminal", amount_oere: 10000 }],
    prepaidWithoutAmount: 1,
    openRepairs: 4,
    receipts: [
      { total_amount: 150000, offset_amount: 50000, location_id: "loc-vejle" },
      { total_amount: 90000, offset_amount: null, location_id: null },
    ],
    offers: [{ status: "accepted" }, { status: "pending" }, { status: "rejected" }],
    funnel: { visits: 1200, addToCart: 80 },
    abandoned: 3,
    devices: [
      { purchase_price: 250000, purchased_at: "2026-08-01T10:00:00Z", template_id: "tpl-1", status: "listed" },
      { purchase_price: 100000, purchased_at: "2026-11-10T10:00:00Z", template_id: "tpl-2", status: "intake" },
    ],
    publishedTemplateIds: ["tpl-1", "tpl-2", "tpl-3"],
    accessoryStock: [{ quantity: 2, cost_price: 50000 }, { quantity: 3, cost_price: null }],
    partialRefunds: [2500, 1000],
    unavailable: [],
    ...over,
  };
}

const EMPTY: Partial<BuildInput> = {
  orders: [],
  prevOrders: [],
  nowOrders: [],
  tickets: [],
  payments: [],
  prepaidWithoutAmount: 0,
  openRepairs: 0,
  receipts: [],
  offers: [],
  funnel: null,
  abandoned: 0,
  devices: [],
  publishedTemplateIds: [],
  accessoryStock: [],
  partialRefunds: [],
};

function numbers(v: unknown, out: number[] = []): number[] {
  if (typeof v === "number") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => numbers(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => numbers(x, out));
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("buildPayload", () => {
  it("owner payload sums", () => {
    const p = buildPayload(input(), OWNER);
    expect(p.total.revenue).not.toBe(0);
    expect(sum(p.series.map((s) => s.webshop.revenue + s.kasse.revenue + s.reparation.revenue))).toBe(p.total.revenue);
    expect(sum(p.byStore.map((s) => s.money.revenue))).toBe(p.total.revenue);
    expect(sum(p.categories!.map((c) => c.money.revenue))).toBe(p.total.revenue);
    expect(sum(p.categories!.map((c) => c.money.profit))).toBe(p.total.profit);
  });

  it("non-owner payload has no owner-only data", () => {
    const json = JSON.stringify(buildPayload(input({ unavailable: ["devices", "accessoryStock"] }), STAFF_VIEWER));
    for (const word of ["profit", "marginPct", "cost", "costValue", "staff", "categories", "missingCost", "prevProfit", "withoutPartsCost"]) {
      expect(json, word).not.toContain(word);
    }
  });

  it("stripForViewer is idempotent and leaves an owner payload unchanged", () => {
    const owner = buildPayload(input(), OWNER);
    const copy: StatPayload = JSON.parse(JSON.stringify(owner));
    expect(stripForViewer(owner, OWNER)).toEqual(copy);

    const once = stripForViewer(owner, STAFF_VIEWER);
    expect(stripForViewer(once, STAFF_VIEWER)).toEqual(once);
    expect(once).toEqual(buildPayload(input(), STAFF_VIEWER));
    // Ejerens payload er ikke ændret af afskæringen.
    expect(owner).toEqual(copy);
  });

  it("empty period", () => {
    const i = input(EMPTY);
    const p = buildPayload(i, OWNER);
    expect(p.total.revenue).toBe(0);
    expect(p.total.deltaPct).toBeNull();
    expect(p.series).toHaveLength(i.range.buckets.length);
    const json = JSON.stringify(p);
    expect(json).not.toContain("NaN");
    expect(numbers(p).every((n) => Number.isFinite(n))).toBe(true);
  });

  it("prev series aligns", () => {
    const p = buildPayload(input(), OWNER);
    // Forrige periode er 7.-9. nov.; ordren 8. nov. er 2. interval (5000 inkl. moms, 4000 uden).
    expect(p.series.map((s) => s.prevRevenue)).toEqual([0, 4000, 0]);
    expect(p.series.map((s) => s.prevProfit)).toEqual([0, 3000, 0]);

    const year = buildPayload(input({ range: statRange("aar", NOW) }), OWNER);
    expect(year.series.length).toBeGreaterThan(0);
    expect(year.series.every((s) => s.prevRevenue === null)).toBe(true);
  });

  it("payment fallback maps legacy payment_method values onto the existing rows", () => {
    const orders = [
      pos("k1", "2026-11-10T10:00:00Z"), // betalt med order_payments: kontant
      pos("k2", "2026-11-10T11:00:00Z", { payment_method: "cash", total: 5000 }),
      pos("k3", "2026-11-10T12:00:00Z", { payment_method: "card", total: 7000 }),
      pos("k4", "2026-11-10T13:00:00Z", { payment_method: "kort_terminal", total: 1000 }),
      pos("k5", "2026-11-10T14:00:00Z", { payment_method: "split", total: 3000 }),
      pos("k6", "2026-11-10T15:00:00Z", { payment_method: "draft", total: 2000 }),
      pos("k7", "2026-11-10T16:00:00Z", { payment_method: null, total: 500 }),
    ];
    const p = buildPayload(input({ orders, payments: [{ order_id: "k1", type: "kontant", amount_oere: 10000 }] }), OWNER);
    expect(p.payments).toEqual([
      { type: "kontant", label: "Kontant", amount: 15000 },
      { type: "kort_terminal", label: "Kort", amount: 8000 },
      { type: "split", label: "Delt betaling", amount: 3000 },
      { type: "ukendt", label: "Ukendt", amount: 2500 },
    ]);
  });

  it("counts paid repairs without booked parts cost, for the owner only", () => {
    const repair = (id: string, ticket: string, purchase_price: number | null, quantity = 1): OverviewOrder =>
      pos(id, "2026-11-11T10:00:00Z", {
        total: 50000 * quantity,
        vat_total: 10000 * quantity,
        order_items: [
          { item_type: "repair_service", repair_ticket_id: ticket, quantity, total_price: 50000 * quantity, vat_amount: 10000 * quantity, vat_scheme: "regular", purchase_price },
        ],
      });
    const orders = [
      ...ORDERS, // t1 med kostpris 200 kr.
      repair("r1", "t2", null),
      repair("r2", "t3", 0),
      repair("r3", "t4", 15000),
      // Krediteret sag uden kostpris: kreditnotaen tæller ikke som betalt sag.
      { ...repair("r4", "t5", null, -1), type: "credit_note" },
    ];
    const owner = buildPayload(input({ orders }), OWNER);
    expect(owner.repairs.paidCases).toBe(4);
    expect(owner.repairs.withoutPartsCost).toBe(2);
    expect(buildPayload(input(), OWNER).repairs.withoutPartsCost).toBe(0);
    expect(buildPayload(input({ orders }), STAFF_VIEWER).repairs).not.toHaveProperty("withoutPartsCost");
  });

  it("lists failed sections for every viewer", () => {
    const failed = input({ receipts: [], unavailable: ["receipts", "funnel"], funnel: null });
    expect(buildPayload(failed, OWNER).unavailable).toEqual(["receipts", "funnel"]);
    expect(buildPayload(failed, STAFF_VIEWER).unavailable).toEqual(["receipts", "funnel"]);
    expect(buildPayload(input(), OWNER).unavailable).toEqual([]);
  });
});

describe("prevBuckets", () => {
  // Over 366 dage: måneds-inddeling; forrige periode er de 444 dage før og starter midt i juni.
  const later = new Date("2026-11-20T12:00:00Z");
  const range = statRange({ from: "2025-09-01", to: "2026-11-18" }, later);
  const days = (b: { startIso: string; endIso: string }) =>
    Math.round(
      (Date.parse(`${copenhagenDateString(b.endIso)}T00:00:00Z`) - Date.parse(`${copenhagenDateString(b.startIso)}T00:00:00Z`)) / 86_400_000,
    );

  it("month buckets cover the previous period exactly, each with the same number of days", () => {
    expect(range.unit).toBe("maaned");
    expect(range.prev).not.toBeNull();
    const prev = prevBuckets(range)!;
    expect(prev).toHaveLength(range.buckets.length);
    expect(prev[0].startIso).toBe(range.prev!.startIso);
    expect(prev[prev.length - 1].endIso).toBe(range.prev!.endIso);
    prev.forEach((b, i) => {
      if (i > 0) expect(b.startIso).toBe(prev[i - 1].endIso);
      expect(days(b)).toBe(days(range.buckets[i]));
    });
    expect(copenhagenDateString(range.prev!.startIso)).toBe("2024-06-14");
  });

  it("previous-period sales land in the bucket of equal position and sum to the previous total", () => {
    const start = Date.parse(range.prev!.startIso);
    const end = Date.parse(range.prev!.endIso);
    const iso = (ms: number) => new Date(ms).toISOString();
    const prevOrders = [
      pos("a", iso(start + 3_600_000), { total: 5000, vat_total: 1000 }),
      pos("b", iso(end - 3_600_000), { total: 5000, vat_total: 1000 }),
    ];
    const p = buildPayload(input({ range, now: later, orders: [], nowOrders: [], prevOrders }), OWNER);
    // Hver ordre er 5000 inkl. moms = 4000 uden.
    expect(p.series[0].prevRevenue).toBe(4000);
    expect(p.series[p.series.length - 1].prevRevenue).toBe(4000);
    expect(sum(p.series.map((s) => s.prevRevenue ?? 0))).toBe(8000);
  });
});
