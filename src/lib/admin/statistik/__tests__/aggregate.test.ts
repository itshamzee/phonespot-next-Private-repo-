import { describe, expect, it } from "vitest";
import type { StaffLookup, StatLine } from "../lines";
import { countOrders, groupLines, pctDelta, seriesByBucket, staffTable, sumLines, topProducts } from "../aggregate";
import { statRange } from "../range";

function line(over: Partial<StatLine>): StatLine {
  return {
    orderId: "o",
    at: "2026-11-18T10:00:00Z",
    stream: "kasse",
    category: "tilbehoer",
    store: "vejle",
    staffId: null,
    productKey: "sku:x",
    name: "Vare",
    quantity: 1,
    revenue: 0,
    revenueInclVat: 0,
    cost: 0,
    missingCost: false,
    ...over,
  };
}

const ZERO = { revenue: 0, revenueInclVat: 0, cost: 0, profit: 0, marginPct: null, missingCost: 0 };

describe("sumLines", () => {
  it("returns zeros and a null margin for no lines", () => {
    expect(sumLines([])).toEqual(ZERO);
  });

  it("computes profit and a one-decimal margin", () => {
    const t = sumLines([
      line({ revenue: 30000, revenueInclVat: 37500, cost: 10000 }),
      line({ revenue: 0, cost: 0, missingCost: true }),
    ]);
    expect(t).toEqual({ revenue: 30000, revenueInclVat: 37500, cost: 10000, profit: 20000, marginPct: 66.7, missingCost: 1 });
  });

  it("gives a null margin, not NaN, for negative revenue", () => {
    expect(sumLines([line({ revenue: -5000, cost: -2000 })]).marginPct).toBeNull();
  });
});

describe("groupLines", () => {
  it("totals lines per key", () => {
    const g = groupLines([line({ stream: "kasse", revenue: 100 }), line({ stream: "webshop", revenue: 50 }), line({ stream: "kasse", revenue: 25 })], (l) => l.stream);
    expect(g.kasse.revenue).toBe(125);
    expect(g.webshop.revenue).toBe(50);
    expect(Object.keys(g).sort()).toEqual(["kasse", "webshop"]);
  });
});

describe("seriesByBucket", () => {
  const range = statRange({ from: "2026-11-17", to: "2026-11-18" }, new Date("2026-11-18T13:00:00Z"));

  it("buckets by Danish date and sums to the line totals", () => {
    const lines = [
      line({ at: "2026-11-17T23:30:00Z", stream: "webshop", revenue: 1000, cost: 400 }), // 18. nov. dansk tid
      line({ at: "2026-11-17T12:00:00Z", stream: "kasse", revenue: 2000, cost: 500 }),
      line({ at: "2026-11-18T09:00:00Z", stream: "reparation", revenue: 3000, cost: 0 }),
      line({ at: "2026-11-18T09:00:00Z", stream: "kasse", revenue: -500, cost: -100 }),
    ];
    const series = seriesByBucket(lines, range.buckets);
    expect(series.map((s) => s.key)).toEqual(["2026-11-17", "2026-11-18"]);
    const [d17, d18] = series;
    expect(d17.label).toBe("17. nov.");
    expect(d17.kasse.revenue).toBe(2000);
    expect(d17.webshop.revenue).toBe(0);
    expect(d18.webshop.revenue).toBe(1000);
    expect(d18.reparation.revenue).toBe(3000);
    expect(d18.kasse.revenue).toBe(-500);
    expect(d18.total.revenue).toBe(3500);

    const all = sumLines(lines);
    expect(series.reduce((s, b) => s + b.total.revenue, 0)).toBe(all.revenue);
    expect(series.reduce((s, b) => s + b.total.cost, 0)).toBe(all.cost);
    expect(series.reduce((s, b) => s + b.total.profit, 0)).toBe(all.profit);
  });

  it("gives a null margin for a negative-revenue bucket", () => {
    const series = seriesByBucket([line({ at: "2026-11-17T12:00:00Z", revenue: -1000, cost: -400 })], range.buckets);
    expect(series[0].total.marginPct).toBeNull();
    expect(series[0].kasse.marginPct).toBeNull();
    expect(series[1].total).toEqual(ZERO);
  });
});

describe("pctDelta", () => {
  it("returns a one-decimal change, null without a positive base", () => {
    expect(pctDelta(110, 100)).toBe(10);
    expect(pctDelta(5, 0)).toBeNull();
    expect(pctDelta(5, -10)).toBeNull();
    expect(pctDelta(1, 3)).toBe(-66.7);
  });
});

describe("staffTable", () => {
  const staff: StaffLookup = [
    { id: "a", name: "Sara Holm", active: true },
    { id: "b", name: "Mikkel Berg", active: true },
  ];
  const storeOfStaff = new Map([["a", "vejle"], ["b", "slagelse"]]);

  it("adds Ikke fordelt only when unassigned revenue is non-zero and rows sum to kasse + reparation", () => {
    const lines = [
      line({ orderId: "o1", stream: "kasse", staffId: "a", revenue: 10000, cost: 4000 }),
      line({ orderId: "o1", stream: "kasse", staffId: "a", revenue: 2000, cost: 0, productKey: "oevrigt" }),
      line({ orderId: "o2", stream: "kasse", staffId: "a", revenue: 5000, cost: 1000 }),
      line({ orderId: "o2", stream: "reparation", staffId: "b", productKey: "ticket:t1", revenue: 8000, cost: 2000 }),
      line({ orderId: "o3", stream: "reparation", staffId: "b", productKey: "ticket:t2", revenue: 4000, cost: 0 }),
      line({ orderId: "o4", stream: "kasse", staffId: null, revenue: 3000, cost: 1000 }),
      line({ orderId: "o5", stream: "webshop", staffId: null, revenue: 99999, cost: 0 }),
    ];
    const rows = staffTable(lines, staff, storeOfStaff);
    expect(rows.map((r) => r.name)).toEqual(["Sara Holm", "Mikkel Berg", "Ikke fordelt"]);
    expect(rows[0]).toMatchObject({ staffId: "a", store: "vejle", sales: 2, repairs: 0 });
    expect(rows[0].totals.revenue).toBe(17000);
    expect(rows[1]).toMatchObject({ staffId: "b", store: "slagelse", sales: 0, repairs: 2 });
    expect(rows[2]).toMatchObject({ staffId: null, store: null, sales: 1, repairs: 0 });

    const inStores = sumLines(lines.filter((l) => l.stream !== "webshop"));
    expect(rows.reduce((s, r) => s + r.totals.revenue, 0)).toBe(inStores.revenue);
    expect(rows.reduce((s, r) => s + r.totals.cost, 0)).toBe(inStores.cost);
  });

  it("leaves out Ikke fordelt when nothing is unassigned", () => {
    const rows = staffTable(
      [line({ orderId: "o1", staffId: "a", revenue: 100 }), line({ orderId: "o9", staffId: null, revenue: 0 })],
      staff,
      storeOfStaff,
    );
    expect(rows.map((r) => r.name)).toEqual(["Sara Holm"]);
  });
});

describe("topProducts", () => {
  it("orders by revenue and nets credited units", () => {
    const lines = [
      line({ productKey: "sku:a", name: "Cover", quantity: 2, revenue: 30000, cost: 10000 }),
      line({ productKey: "sku:a", name: "Cover", quantity: -1, revenue: -15000, cost: -5000 }),
      line({ productKey: "device:d1", name: "iPhone 14", category: "enheder", quantity: 1, revenue: 280000, cost: 200000 }),
      line({ productKey: "sku:b", name: "Kabel", quantity: 3, revenue: 9000, cost: 3000 }),
      line({ productKey: "oevrigt", name: "Fragt og rabatter", category: "oevrigt", quantity: 0, revenue: 500000 }),
    ];
    const top = topProducts(lines, 2);
    expect(top.map((p) => p.productKey)).toEqual(["device:d1", "sku:a"]);
    expect(top[0]).toMatchObject({ name: "iPhone 14", category: "enheder", units: 1 });
    expect(top[1]).toMatchObject({ name: "Cover", category: "tilbehoer", units: 1 });
    expect(top[1].totals).toMatchObject({ revenue: 15000, cost: 5000, profit: 10000 });
  });
});

describe("countOrders", () => {
  it("counts sales and credit notes like computeKpis", () => {
    expect(
      countOrders([
        { type: "pos", total: 100 },
        { type: "online", total: 100 },
        { type: "repair_prepaid", total: 100 },
        { type: "credit_note", total: -100 },
      ]),
    ).toEqual({ sales: 3, credits: 1 });
  });
});
