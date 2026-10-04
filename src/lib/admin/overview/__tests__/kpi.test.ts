import { describe, expect, it } from "vitest";
import { computeKpis, estimateStandardVat, groupByStore, pctChange, type OverviewOrder } from "../kpi";

// Alle beløb i øre.
const iphoneBrugtmoms: OverviewOrder = {
  type: "pos",
  total: 600_000,
  vat_total: 0,
  brugtmoms_total: 30_000, // marginen 150.000 * 25/125
  order_items: [
    { item_type: "device", quantity: 1, total_price: 600_000, discount_amount: 0, purchase_price: 450_000, vat_scheme: "brugtmoms" },
  ],
};
const cover: OverviewOrder = {
  type: "pos",
  total: 12_500,
  vat_total: 2_500,
  brugtmoms_total: 0,
  order_items: [
    { item_type: "sku_product", quantity: 1, total_price: 12_500, discount_amount: 0, purchase_price: 5_000, vat_scheme: "regular" },
  ],
};
const coverReturned: OverviewOrder = {
  type: "credit_note",
  total: -12_500,
  vat_total: -2_500,
  brugtmoms_total: 0,
  order_items: [
    { item_type: "sku_product", quantity: -1, total_price: -12_500, discount_amount: 0, purchase_price: 5_000, vat_scheme: "regular" },
  ],
};

describe("computeKpis", () => {
  it("profit fratrækker brugtmoms, ikke kun standardmoms", () => {
    const k = computeKpis([iphoneBrugtmoms]);
    expect(k.revenue).toBe(600_000);
    expect(k.brugtmoms).toBe(30_000);
    expect(k.revenueExVat).toBe(570_000);
    expect(k.cost).toBe(450_000);
    expect(k.profit).toBe(120_000);
    expect(k.marginPct).toBe(21);
  });

  it("blander brugtmoms og standardmoms og regner gennemsnitskurv på salg", () => {
    const k = computeKpis([iphoneBrugtmoms, cover]);
    expect(k.revenue).toBe(612_500);
    expect(k.vatStandard).toBe(2_500);
    expect(k.profit).toBe(120_000 + 5_000);
    expect(k.salesCount).toBe(2);
    expect(k.avgBasket).toBe(306_250);
  });

  it("kreditnotaer trækker omsætning, moms og kostpris fra, men tæller ikke som salg", () => {
    const k = computeKpis([iphoneBrugtmoms, cover, coverReturned]);
    expect(k.revenue).toBe(600_000);
    expect(k.vatStandard).toBe(0);
    expect(k.profit).toBe(120_000);
    expect(k.salesCount).toBe(2);
    expect(k.creditCount).toBe(1);
  });

  it("depositum er ikke omsætning, når det modtages eller bruges, og momsen følger med", () => {
    const depositSale: OverviewOrder = {
      type: "pos",
      total: 50_000,
      vat_total: 10_000,
      order_items: [{ item_type: "deposit", quantity: 1, total_price: 50_000, vat_amount: 10_000, vat_scheme: "regular" }],
    };
    const k1 = computeKpis([depositSale]);
    expect(k1.revenue).toBe(0);
    expect(k1.revenueExVat).toBe(0);
    expect(k1.deposits).toBe(50_000);
    expect(k1.vatStandard).toBe(10_000);

    // Reparationen afregnes senere: 1.500 kr. minus depositum 500 kr. betales
    const finalSale: OverviewOrder = {
      type: "pos",
      total: 100_000,
      vat_total: 20_000,
      order_items: [
        { item_type: "repair_service", quantity: 1, total_price: 150_000, vat_amount: 30_000, vat_scheme: "regular" },
        { item_type: "deposit_applied", quantity: 1, total_price: -50_000, vat_amount: -10_000, vat_scheme: "regular" },
      ],
    };
    const k2 = computeKpis([finalSale]);
    expect(k2.revenue).toBe(150_000);
    expect(k2.revenueExVat).toBe(120_000); // 1.500 kr. / 1,25
    expect(k2.profit).toBe(120_000);
    expect(k2.deposits).toBe(0);
    expect(k2.avgBasket).toBe(150_000);
  });

  it("udleder 25 % moms på webshop-ordrer, der kun har gemt brugtmoms", () => {
    const online: OverviewOrder = {
      type: "online",
      total: 25_000,
      vat_total: 0,
      brugtmoms_total: 0,
      order_items: [{ item_type: "sku_product", quantity: 1, total_price: 25_000, purchase_price: 10_000, vat_scheme: null }],
    };
    const k = computeKpis([online]);
    expect(k.vatStandard).toBe(5_000);
    expect(k.revenueExVat).toBe(20_000);
    expect(k.profit).toBe(10_000);
    expect(estimateStandardVat(online.order_items!)).toBe(5_000);
  });

  it("POS-ordrer udleder ikke moms (vat_total er facit)", () => {
    const k = computeKpis([{ ...iphoneBrugtmoms }]);
    expect(k.vatStandard).toBe(0);
  });

  it("tom periode giver nuller og ingen division med nul", () => {
    const k = computeKpis([]);
    expect(k).toMatchObject({ revenue: 0, salesCount: 0, avgBasket: 0, profit: 0, marginPct: null });
  });
});

describe("pctChange", () => {
  it("giver procent mod forrige periode, og null uden grundlag", () => {
    expect(pctChange(1120, 1000)).toBe(12);
    expect(pctChange(800, 1000)).toBe(-20);
    expect(pctChange(500, 0)).toBeNull();
  });
});

describe("groupByStore", () => {
  it("ordrer uden fysisk lokation hører til webshoppen", () => {
    const slug = (id: string | null | undefined) => (id === "L-v" ? "vejle" : null);
    const g = groupByStore(
      [
        { location_id: "L-v", n: 1 },
        { location_id: null, n: 2 },
        { location_id: "ukendt", n: 3 },
      ],
      slug,
    );
    expect(g.vejle).toHaveLength(1);
    expect(g.webshop).toHaveLength(2);
  });
});
