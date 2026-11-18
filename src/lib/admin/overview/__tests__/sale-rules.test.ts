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
  it("puts the cost on the repair line when a deposit line with the ticket id comes first", () => {
    const o = { ...order(1, 100000), order_items: [
      { item_type: "deposit", quantity: 1, total_price: 20000, purchase_price: null, repair_ticket_id: "t1" },
      { item_type: "repair_service", quantity: 1, total_price: 100000, purchase_price: null, repair_ticket_id: "t1" },
    ] };
    const [out] = applyRepairCosts([o], new Map([["t1", 30000]]));
    expect(out.order_items![0].purchase_price).toBeNull();
    expect(out.order_items![1].purchase_price).toBe(30000);
    expect(computeKpis([out]).cost).toBe(30000);
  });
  it("prefers the repair line over an earlier free-text line of the same ticket", () => {
    const o = { ...order(1, 100000), order_items: [
      { item_type: "free_text", quantity: 1, total_price: 5000, purchase_price: null, repair_ticket_id: "t1" },
      { item_type: "repair_service", quantity: 1, total_price: 95000, purchase_price: null, repair_ticket_id: "t1" },
    ] };
    const [out] = applyRepairCosts([o], new Map([["t1", 30000]]));
    expect(out.order_items![0].purchase_price).toBe(0);
    expect(out.order_items![1].purchase_price).toBe(30000);
  });
  it("falls back to the first null-cost line when the ticket has no repair line", () => {
    const o = { ...order(1, 100000), order_items: [
      { item_type: "free_text", quantity: 1, total_price: 60000, purchase_price: null, repair_ticket_id: "t1" },
      { item_type: "free_text", quantity: 1, total_price: 40000, purchase_price: null, repair_ticket_id: "t1" },
    ] };
    const [out] = applyRepairCosts([o], new Map([["t1", 30000]]));
    expect(out.order_items!.map((i) => i.purchase_price)).toEqual([30000, 0]);
  });
  it("keeps purchase_price a whole øre amount on odd quantities", () => {
    const [out] = applyRepairCosts([order(3, 100000)], new Map([["t1", 10000]]));
    expect(out.order_items![0].purchase_price).toBe(3333);
    expect(Number.isInteger(out.order_items![0].purchase_price)).toBe(true);
  });
  it("leaves a quantity-0 line untouched", () => {
    const [out] = applyRepairCosts([order(0, 0)], new Map([["t1", 30000]]));
    expect(out.order_items![0].purchase_price).toBeNull();
    expect(computeKpis([out]).cost).toBe(0);
  });
});
