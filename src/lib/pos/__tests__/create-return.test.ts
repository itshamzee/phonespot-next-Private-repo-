// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const item = (id: string, sku: unknown) => ({
  id,
  item_type: "sku_product",
  device_id: null,
  sku_product_id: U(5),
  description: "Cover",
  quantity: 1,
  unit_price: 5900,
  total_price: 5900,
  discount_amount: 0,
  vat_amount: 1180,
  vat_scheme: "regular",
  purchase_price: null,
  sku_products: sku,
});

const s = vi.hoisted(() => ({
  items: [] as unknown[],
  credits: [] as unknown[],
  payments: [] as Array<{ order_id: string; type: string; amount_oere: number }>,
}));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q,
        or: () => q,
        limit: () => q,
        maybeSingle: async () => ({
          data:
            table === "orders"
              ? { id: U(1), order_number: "POS-1", receipt_number: "V1-000123", confirmed_at: null, total: 5900, location_id: null, customer_id: null }
              : null,
        }),
        eq: (col: string) => {
          if (table === "order_items" && col === "order_id") return Promise.resolve({ data: s.items });
          if (table === "orders" && col === "original_order_id") return Promise.resolve({ data: s.credits });
          return q;
        },
        in: async (_col: string, ids: string[]) =>
          table === "order_payments"
            ? { data: s.payments.filter((p) => ids.includes(p.order_id)) }
            : { data: [] },
      };
      return q;
    },
  }),
}));
vi.mock("../receipt-data", () => ({ renderReceiptPdf: vi.fn() }));

import { findReturnableOrder } from "../create-return";

describe("findReturnableOrder lagersalg", () => {
  it("markerer lagersalgslinjer på et returnerbart salg", async () => {
    s.items = [
      item(U(10), { subcategory: "cover", attributes: { udsalg: "Ja" } }),
      item(U(11), [{ subcategory: "cover", attributes: {} }]),
      item(U(12), null),
      item(U(13), { subcategory: "screen_protector", attributes: { udsalg: "Ja" } }),
    ];
    const order = await findReturnableOrder("V1-000123");
    expect(order.lines.map((l) => l.lagersalg)).toEqual([true, false, false, false]);
    expect(JSON.stringify(order)).not.toContain("udsalg");
  });
});

describe("findReturnableOrder opkøb", () => {
  it("returns the opkøb share and what earlier returns paid out in money", async () => {
    s.items = [item(U(10), null)];
    s.credits = [{ id: U(2) }, { id: U(3) }];
    s.payments = [
      { order_id: U(1), type: "opkoeb", amount_oere: 3000 },
      { order_id: U(1), type: "kontant", amount_oere: 2900 },
      { order_id: U(2), type: "kontant", amount_oere: -1000 },
      { order_id: U(2), type: "tilgodebevis", amount_oere: -500 },
      { order_id: U(3), type: "mobilepay", amount_oere: -400 },
      { order_id: U(9), type: "opkoeb", amount_oere: 99999 },
    ];
    const order = await findReturnableOrder("V1-000123");
    expect(order.opkoebPaid).toBe(3000);
    expect(order.nonVoucherRefunded).toBe(1400);
  });

  it("is 0/0 for a sale without opkøb or returns", async () => {
    s.items = [item(U(10), null)];
    s.credits = [];
    s.payments = [{ order_id: U(1), type: "kontant", amount_oere: 5900 }];
    const order = await findReturnableOrder("V1-000123");
    expect(order.opkoebPaid).toBe(0);
    expect(order.nonVoucherRefunded).toBe(0);
  });
});
