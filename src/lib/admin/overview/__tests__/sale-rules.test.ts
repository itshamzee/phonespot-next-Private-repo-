import { describe, expect, it } from "vitest";
import { applyRepairCosts, pickupStoreSlug, prepaidRepairOrders, storeSlugForOrder } from "../sale-rules";
import { computeKpis } from "../kpi";

const slugOf = (id: string | null | undefined) => (id === "loc-v" ? "vejle" : id === "loc-w" ? "webshop" : null);

describe("store attribution", () => {
  it("maps pickup methods to stores", () => {
    expect(pickupStoreSlug("click_collect_vejle")).toBe("vejle");
    expect(pickupStoreSlug("pickup_slagelse")).toBe("slagelse");
    expect(pickupStoreSlug("pakkeshop")).toBeNull();
    expect(pickupStoreSlug(null)).toBeNull();
  });
  it("online pickup order belongs to the pickup store; shipped online stays webshop", () => {
    expect(storeSlugForOrder({ type: "online", location_id: null, shipping_method: "click_collect_slagelse" }, slugOf)).toBe("slagelse");
    expect(storeSlugForOrder({ type: "online", location_id: null, shipping_method: "postnord" }, slugOf)).toBe("webshop");
    expect(storeSlugForOrder({ type: "pos", location_id: "loc-v", shipping_method: null }, slugOf)).toBe("vejle");
  });
});

describe("prepaidRepairOrders", () => {
  it("builds one order per ticket with 25 % VAT and skips tickets without amount", () => {
    const { orders, withoutAmount } = prepaidRepairOrders([
      { id: "t1", paid_at: "2026-11-17T10:00:00Z", location_id: "loc-v", total_price_dkk: 899 },
      { id: "t2", paid_at: "2026-11-17T11:00:00Z", location_id: "loc-v", total_price_dkk: null },
    ]);
    expect(withoutAmount).toBe(1);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ type: "repair_prepaid", total: 89900, vat_total: 17980, location_id: "loc-v" });
    const k = computeKpis(orders);
    expect(k.revenueExVat).toBe(71920); expect(k.salesCount).toBe(1);
  });
});

describe("applyRepairCosts", () => {
  const order = (qty: number, total: number) => ({
    type: qty < 0 ? "credit_note" : "pos", total, vat_total: Math.round(total / 5), brugtmoms_total: 0,
    order_items: [
      { item_type: "repair", quantity: qty, total_price: total, purchase_price: null, repair_ticket_id: "t1" },
    ],
  });
  it("subtracts parts cost from repair profit", () => {
    const [o] = applyRepairCosts([order(1, 100000)], new Map([["t1", 30000]]));
    expect(computeKpis([o]).profit).toBe(80000 - 30000);
  });
  it("reverses the cost on a credit note", () => {
    const both = applyRepairCosts([order(1, 100000), order(-1, -100000)], new Map([["t1", 30000]]));
    expect(computeKpis(both).profit).toBe(0);
  });
  it("counts the ticket cost once when a ticket has several lines", () => {
    const o = { ...order(1, 100000), order_items: [
      { item_type: "repair", quantity: 1, total_price: 60000, purchase_price: null, repair_ticket_id: "t1" },
      { item_type: "repair", quantity: 1, total_price: 40000, purchase_price: null, repair_ticket_id: "t1" },
    ] };
    expect(computeKpis(applyRepairCosts([o], new Map([["t1", 30000]]))).cost).toBe(30000);
  });
  it("leaves lines that already have a cost, and tickets without parts, untouched", () => {
    const [o] = applyRepairCosts([order(1, 100000)], new Map());
    expect(o.order_items![0].purchase_price).toBeNull();
  });
});
