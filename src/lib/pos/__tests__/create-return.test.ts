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

const s = vi.hoisted(() => ({ items: [] as unknown[] }));

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
          return q;
        },
        in: async () => ({ data: [] }),
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
