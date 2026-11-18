import { describe, expect, it } from "vitest";
import type { OverviewOrder } from "@/lib/admin/overview/kpi";
import type { ScopeSlug } from "@/lib/auth/store-scope";
import type { StatViewer } from "../access";
import { buildPayload, stripForViewer, type BuildInput, type StatPayload } from "../payload";
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
      { item_type: "device", device_id: "d1", name: "iPhone 14", quantity: 1, total_price: 400000, vat_scheme: "brugtmoms", purchase_price: 300000 },
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
    const json = JSON.stringify(buildPayload(input(), STAFF_VIEWER));
    for (const word of ["profit", "marginPct", "cost", "costValue", "staff", "categories", "missingCost", "prevProfit"]) {
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
});
