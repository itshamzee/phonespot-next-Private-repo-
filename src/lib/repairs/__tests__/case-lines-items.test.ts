// @vitest-environment node
import { describe, expect, it } from "vitest";
import { caseLines, computeCaseTotals, isOwnLineKind, isRepairLineKind, type CaseItemRow } from "../case-money";
import { casePaymentLines, toSaleItems, planAppliedDeposits, type CaseContext } from "@/lib/pos/kasse-logic";
import { saleItemSchema } from "@/lib/pos/schemas";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const item = (over: Partial<CaseItemRow> & Pick<CaseItemRow, "id" | "kind" | "description" | "unit_price_oere">): CaseItemRow => ({
  qty: 1,
  stock_status: "none",
  created_at: "2026-10-05T10:00:00Z",
  ...over,
});

const ticket = {
  services: [{ id: "svc", name: "Gammel reparation", price_dkk: 500 }],
  booking_details: { selected_services: [{ id: "b", name: "Booking", price_dkk: 300 }] },
};
const quotes = [{ price_dkk: 200, created_at: "2026-10-01" }];

describe("caseLines priority: items, then services, then booking, then quote", () => {
  it("items win over services, booking and quote", () => {
    const lines = caseLines(ticket, quotes, [item({ id: "i1", kind: "repair", description: "Skærmskift", unit_price_oere: 79900 })]);
    expect(lines.map((l) => l.name)).toEqual(["Skærmskift"]);
    expect(lines[0]).toMatchObject({ kind: "repair", total_oere: 79900, item_id: "i1" });
  });
  it("services win when there are no items", () => {
    expect(caseLines(ticket, quotes, []).map((l) => l.name)).toEqual(["Gammel reparation"]);
  });
  it("booking wins over quote, quote is last", () => {
    expect(caseLines({ booking_details: ticket.booking_details }, quotes).map((l) => l.name)).toEqual(["Booking"]);
    expect(caseLines({}, quotes)[0].kind).toBe("quote");
  });
  it("released items (cancelled case) do not count as items", () => {
    const lines = caseLines(ticket, [], [item({ id: "i1", kind: "repair", description: "x", unit_price_oere: 1, stock_status: "released" })]);
    expect(lines.map((l) => l.name)).toEqual(["Gammel reparation"]);
  });
  it("quantity multiplies, parts are listed at 0 and sold items drop out of the total", () => {
    const lines = caseLines({}, [], [
      item({ id: "r", kind: "repair", description: "Skærm", unit_price_oere: 100000 }),
      item({ id: "p", kind: "part", description: "Del", unit_price_oere: 0, parent_item_id: "r", created_at: "2026-10-05T10:00:01Z" }),
      item({ id: "c", kind: "product", description: "Cover", unit_price_oere: 20000, qty: 2, sku_product_id: U(2), created_at: "2026-10-05T10:00:02Z" }),
      item({ id: "d", kind: "device", description: "iPhone", unit_price_oere: 300000, device_id: U(3), stock_status: "sold", created_at: "2026-10-05T10:00:03Z" }),
    ]);
    expect(lines.map((l) => l.kind)).toEqual(["repair", "part", "product", "device"]);
    expect(lines[2].total_oere).toBe(40000);
    expect(computeCaseTotals(lines, [], {}).total_oere).toBe(140000);
  });
  it("classifies which lines fold into the repair line", () => {
    for (const k of ["repair", "free_text", "service", "quote", "glass"] as const) expect(isRepairLineKind(k)).toBe(true);
    expect(isRepairLineKind("device")).toBe(false);
    expect(isOwnLineKind("product")).toBe(true);
    expect(isOwnLineKind("repair")).toBe(false);
  });
});

function ctxFor(lines: ReturnType<typeof caseLines>): CaseContext {
  const totals = computeCaseTotals(lines, [], {});
  return {
    id: U(1),
    ticketNumber: "PS-2026-0001",
    paid: false,
    customer: { id: null, name: "Mette", phone: null, email: null },
    deviceLabel: "iPhone 15",
    totalOere: totals.total_oere,
    lines,
    description: "Sag PS-2026-0001 · iPhone 15 · Skærm",
    deposits: [{ id: U(9), amount_oere: 20000, paid_at: "2026-10-04T10:00:00Z", remaining_oere: 20000 }],
    depositsOk: true,
  };
}

describe("kasse: sagslinjer", () => {
  const lines = caseLines({}, [], [
    item({ id: "r", kind: "repair", description: "Skærm", unit_price_oere: 100000 }),
    item({ id: "f", kind: "free_text", description: "Rens", unit_price_oere: 5000, created_at: "2026-10-05T10:00:01Z" }),
    item({ id: "c", kind: "product", description: "Cover", unit_price_oere: 20000, qty: 2, sku_product_id: U(2), stock_status: "reserved", created_at: "2026-10-05T10:00:02Z" }),
    item({ id: "d", kind: "device", description: "iPhone 12", unit_price_oere: 300000, device_id: U(3), vat_scheme: "brugtmoms", stock_status: "reserved", created_at: "2026-10-05T10:00:03Z" }),
  ]);

  it("repair and free text stay ONE repair line; product and device become real lines", () => {
    const cart = casePaymentLines(ctxFor(lines));
    expect(cart.map((l) => l.type)).toEqual(["repair_service", "sku_product", "device"]);
    const repair = cart.find((l) => l.type === "repair_service");
    expect(repair && "price" in repair && repair.price).toBe(105000);
  });
  it("a device keeps its brugtmoms scheme and is never folded into the repair line", () => {
    const cart = casePaymentLines(ctxFor(lines));
    const device = cart.find((l) => l.type === "device");
    expect(device).toMatchObject({ type: "device", deviceId: U(3), vatScheme: "brugtmoms", price: 300000, repairTicketItemId: "d" });
    const repair = cart.find((l) => l.type === "repair_service") as { price: number };
    expect(repair.price).toBe(105000);
  });
  it("sale items carry repairTicketItemId and pass the sale schema", () => {
    const items = toSaleItems(casePaymentLines(ctxFor(lines)), []);
    expect(items.find((i) => i.type === "sku_product")).toMatchObject({ skuProductId: U(2), quantity: 2, repairTicketItemId: "c" });
    expect(items.find((i) => i.type === "device")).toMatchObject({ deviceId: U(3), repairTicketItemId: "d" });
    // zod needs real UUID-shaped ids for the item ids
    const parsed = saleItemSchema.safeParse({ type: "device", deviceId: U(3), repairTicketItemId: U(77) });
    expect(parsed.success).toBe(true);
  });
  it("already sold items are not put in the cart again", () => {
    const sold = caseLines({}, [], [
      item({ id: "r", kind: "repair", description: "Skærm", unit_price_oere: 100000 }),
      item({ id: "d", kind: "device", description: "iPhone", unit_price_oere: 300000, device_id: U(3), stock_status: "sold", created_at: "2026-10-05T10:00:03Z" }),
    ]);
    expect(casePaymentLines(ctxFor(sold)).map((l) => l.type)).toEqual(["repair_service"]);
  });
  it("a deposit is only deducted from the repair line, not from the upsell lines", () => {
    const ctx = ctxFor(lines);
    const cart = casePaymentLines(ctx);
    const applied = planAppliedDeposits(cart, ctx, 0);
    expect(applied.reduce((s, a) => s + a.price, 0)).toBe(20000);
  });
  it("old cases (no items) still give one repair line for the whole total", () => {
    const old = caseLines({ services: [{ name: "Skærm", price_dkk: 999 }] }, []);
    const cart = casePaymentLines(ctxFor(old));
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ type: "repair_service", price: 99900 });
  });
});
