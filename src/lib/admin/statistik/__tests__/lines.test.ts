import { describe, expect, it } from "vitest";
import { computeKpis, type OverviewOrder } from "@/lib/admin/overview/kpi";
import type { ScopeSlug } from "@/lib/auth/store-scope";
import { matchStaffByName, toStatLines, type LineCtx, type StaffLookup, type StatLine } from "../lines";
import { groupLines, sumLines, type Totals } from "../aggregate";

const STAFF: StaffLookup = [
  { id: "a", name: "Mikkel Hansen", active: true },
  { id: "b", name: "Mikkel Berg", active: true },
  { id: "c", name: "Sara Holm", active: true },
];

const SLUGS: Record<string, ScopeSlug> = { "loc-v": "vejle", "loc-s": "slagelse" };

function ctx(over: Partial<LineCtx> = {}): LineCtx {
  return {
    slugOf: (id) => (id ? SLUGS[id] ?? null : null),
    technicianByTicket: new Map([["t1", "Sara Holm"]]),
    staff: STAFF,
    ...over,
  };
}

/** Webshop: tilbehør med standardmoms, fragt 39 kr., vat_total 0 (moms udledes). */
const online: OverviewOrder = {
  id: "o1",
  type: "online",
  total: 23800,
  vat_total: 0,
  brugtmoms_total: 0,
  location_id: null,
  shipping_method: "gls_home",
  shipping_cost: 3900,
  confirmed_at: "2026-11-17T10:00:00Z",
  order_items: [
    {
      id: "i1",
      name: "Cover iPhone 15",
      sku_product_id: "sku1",
      item_type: "product",
      quantity: 1,
      total_price: 19900,
      purchase_price: 5000,
      vat_amount: null,
      vat_scheme: "regular",
    },
  ],
};

/** Kassesalg i Vejle: brugtmoms-enhed + reparation på sag t1. */
const pos: OverviewOrder = {
  id: "o2",
  type: "pos",
  total: 350000,
  vat_total: 10000,
  brugtmoms_total: 20000,
  location_id: "loc-v",
  staff_id: "kasse-1",
  confirmed_at: "2026-11-17T12:00:00Z",
  order_items: [
    {
      id: "i2",
      name: "iPhone 14 128 GB",
      device_id: "d1",
      item_type: "device",
      quantity: 1,
      total_price: 300000,
      purchase_price: 200000,
      vat_amount: 20000,
      vat_scheme: "brugtmoms",
    },
    {
      id: "i3",
      name: "Skærmskift iPhone 13",
      repair_ticket_id: "t1",
      item_type: "repair",
      quantity: 1,
      total_price: 50000,
      purchase_price: 8000,
      vat_amount: 10000,
      vat_scheme: "regular",
    },
  ],
};

/** Kreditnota for enheden fra o2. */
const credit: OverviewOrder = {
  id: "o3",
  type: "credit_note",
  total: -300000,
  vat_total: 0,
  brugtmoms_total: -20000,
  location_id: "loc-v",
  staff_id: "kasse-1",
  original_order_id: "o2",
  confirmed_at: "2026-11-18T09:00:00Z",
  order_items: [
    {
      id: "i4",
      name: "iPhone 14 128 GB",
      device_id: "d1",
      item_type: "device",
      quantity: -1,
      total_price: -300000,
      purchase_price: 200000,
      vat_amount: -20000,
      vat_scheme: "brugtmoms",
    },
  ],
};

/** Kassesalg i Slagelse med depositum og et tilbehør. */
const withDeposit: OverviewOrder = {
  id: "o4",
  type: "pos",
  total: 15000,
  vat_total: 3000,
  brugtmoms_total: 0,
  location_id: "loc-s",
  staff_id: "kasse-2",
  confirmed_at: "2026-11-18T10:00:00Z",
  order_items: [
    { id: "i5", name: "Depositum", item_type: "deposit", quantity: 1, total_price: 10000, vat_amount: 2000 },
    {
      id: "i6",
      name: "Ladekabel",
      sku_product_id: "sku2",
      item_type: "product",
      quantity: 1,
      total_price: 5000,
      purchase_price: 2000,
      vat_amount: 1000,
      vat_scheme: "regular",
    },
  ],
};

const ALL = [online, pos, credit, withDeposit];

function sumGroups(groups: Record<string, Totals>) {
  const vals = Object.values(groups);
  return {
    revenue: vals.reduce((s, t) => s + t.revenue, 0),
    revenueInclVat: vals.reduce((s, t) => s + t.revenueInclVat, 0),
    cost: vals.reduce((s, t) => s + t.cost, 0),
  };
}

describe("toStatLines", () => {
  it("sum invariant: lines and every grouping sum to computeKpis to the øre", () => {
    const kpis = computeKpis(ALL);
    const lines = toStatLines(ALL, ctx());
    const total = sumLines(lines);

    expect(kpis.revenueExVat).toBe(15920 + 3900 + 280000 + 40000 - 280000 + 4000);
    expect(total.revenue).toBe(kpis.revenueExVat);
    expect(total.revenueInclVat).toBe(kpis.revenue);
    expect(total.cost).toBe(kpis.cost);
    expect(total.profit).toBe(kpis.profit);

    const expected = { revenue: kpis.revenueExVat, revenueInclVat: kpis.revenue, cost: kpis.cost };
    expect(sumGroups(groupLines(lines, (l) => l.stream))).toEqual(expected);
    expect(sumGroups(groupLines(lines, (l) => l.category))).toEqual(expected);
    expect(sumGroups(groupLines(lines, (l) => l.store))).toEqual(expected);

    expect(lines.some((l) => l.name === "Depositum")).toBe(false);
    const byStream = groupLines(lines, (l) => l.stream);
    expect(byStream.reparation.revenue).toBe(40000);
    expect(byStream.reparation.cost).toBe(8000);
    expect(byStream.webshop.revenue).toBe(19820);
    expect(byStream.kasse.revenue).toBe(280000 - 280000 + 4000);
    const byStore = groupLines(lines, (l) => l.store);
    expect(byStore.webshop.revenue).toBe(19820);
    expect(byStore.vejle.revenue).toBe(40000);
    expect(byStore.slagelse.revenue).toBe(4000);
  });

  it("shipping lands in oevrigt on the webshop stream", () => {
    const lines = toStatLines([online], ctx());
    const product = lines.find((l) => l.productKey === "sku:sku1")!;
    expect(product).toMatchObject({ revenue: 15920, revenueInclVat: 19900, cost: 5000, category: "tilbehoer" });
    const rest = lines.find((l) => l.category === "oevrigt")!;
    expect(rest).toMatchObject({
      stream: "webshop",
      name: "Fragt og rabatter",
      productKey: "oevrigt",
      revenue: 3900,
      revenueInclVat: 3900,
      cost: 0,
      missingCost: false,
      staffId: null,
      store: "webshop",
    });
    expect(lines).toHaveLength(2);
  });

  it("adds no remainder line when the lines already match the order", () => {
    expect(toStatLines([pos], ctx())).toHaveLength(2);
  });

  it("credit note follows the original order's stream", () => {
    const mapped = toStatLines([credit], ctx({ originalStreamByOrderId: new Map([["o2", "webshop"]]) }));
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({ stream: "webshop", revenue: -280000, cost: -200000, quantity: -1, staffId: null });

    const fallback = toStatLines([credit], ctx());
    expect(fallback[0]).toMatchObject({ stream: "kasse", staffId: "kasse-1", category: "enheder", store: "vejle" });
  });

  it("technician match", () => {
    expect(matchStaffByName("sara", STAFF)).toBe("c");
    expect(matchStaffByName("Mikkel", STAFF)).toBeNull();
    expect(matchStaffByName("Mikkel Berg ", STAFF)).toBe("b");
    expect(matchStaffByName("", STAFF)).toBeNull();
    expect(matchStaffByName(null, STAFF)).toBeNull();
    expect(matchStaffByName("sara", [{ id: "c", name: "Sara Holm", active: false }])).toBeNull();

    const matched = toStatLines([pos], ctx()).find((l) => l.productKey === "ticket:t1")!;
    expect(matched).toMatchObject({ stream: "reparation", category: "reparation", staffId: "c" });

    const ambiguous = toStatLines([pos], ctx({ technicianByTicket: new Map([["t1", "Mikkel"]]) }));
    expect(ambiguous.find((l) => l.productKey === "ticket:t1")!.staffId).toBe("kasse-1");
    expect(ambiguous.find((l) => l.productKey === "device:d1")!).toMatchObject({ stream: "kasse", staffId: "kasse-1" });
  });

  it("missing cost", () => {
    const order: OverviewOrder = {
      ...pos,
      order_items: [{ ...pos.order_items![0], purchase_price: null }],
      total: 300000,
      vat_total: 0,
    };
    const lines = toStatLines([order], ctx());
    const device = lines.find((l) => l.productKey === "device:d1")!;
    expect(device).toMatchObject({ missingCost: true, cost: 0, revenue: 280000 });
    expect(sumLines(lines).missingCost).toBe(1);
  });

  it("repair_prepaid lines are reparation and a repair without cost is not missing cost", () => {
    const prepaid: OverviewOrder = {
      type: "repair_prepaid",
      total: 100000,
      vat_total: 20000,
      brugtmoms_total: 0,
      location_id: "loc-v",
      confirmed_at: "2026-11-18T08:00:00Z",
      order_items: [
        { item_type: "repair", quantity: 1, total_price: 100000, vat_amount: 20000, vat_scheme: "regular", repair_ticket_id: "t9", purchase_price: null },
      ],
    };
    const lines: StatLine[] = toStatLines([prepaid], ctx());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ stream: "reparation", category: "reparation", missingCost: false, revenue: 80000, store: "vejle" });
  });
});
