// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/cart/reservation-owner", () => ({ readReservationOwner: async () => null }));
import { toOrderItemRows } from "../order";
import type { ValidatedItem } from "../validate";
import type { CartItem } from "@/lib/cart/types";

const sku = (quantity: number): ValidatedItem => ({
  item: { type: "sku_product", skuProductId: "p1", title: "Cover", image: null, price: 5900, quantity } as CartItem,
  serverPrice: 5900,
  available: true,
  lagersalg: true,
});

describe("toOrderItemRows", () => {
  it("deler en linje på 3 med 1 gratis i betalt og gratis linje", () => {
    const rows = toOrderItemRows("o1", [sku(3)], { "sku:p1": { discount_oere: 5900, freeUnits: 1 } });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ quantity: 2, unit_price: 5900, total_price: 11800, discount_amount: 0 });
    expect(rows[1]).toMatchObject({ quantity: 1, unit_price: 5900, total_price: 5900, discount_amount: 5900 });
  });
  it("én linje med fuld rabat når alle enheder er gratis", () => {
    const rows = toOrderItemRows("o1", [sku(1)], { "sku:p1": { discount_oere: 5900, freeUnits: 1 } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 1, discount_amount: 5900 });
  });
  it("uden rabat er linjen uændret med discount_amount 0", () => {
    const rows = toOrderItemRows("o1", [sku(2)], {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 2, total_price: 11800, discount_amount: 0 });
  });
});
