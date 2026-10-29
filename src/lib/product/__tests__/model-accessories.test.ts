import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
import { pickUpsell } from "@/lib/product/model-accessories";
import type { PublicAccessory } from "@/lib/product/public-accessory";

const item = (id: string, category: string, extra: Partial<PublicAccessory> = {}): PublicAccessory => ({
  id, name: id, slug: id, category, brand: null, price: 19900, sale_price: null, image_url: null,
  created_at: "", store_stock: 0, online_stock: 0, availability: "orderable", lagersalg: false, ...extra,
});

describe("pickUpsell", () => {
  it("alternates cover and glass and skips what cannot be bought", () => {
    const picked = pickUpsell([
      item("glass-a", "beskyttelsesglas"),
      item("glass-b", "beskyttelsesglas"),
      item("cover-sold-out", "covers", { availability: "out_of_stock" }),
      item("cover-a", "covers"),
      item("charger", "opladere"),
    ]);
    expect(picked.map((p) => p.id)).toEqual(["cover-a", "glass-a", "glass-b"]);
  });
  it("puts stock in the store first", () => {
    const picked = pickUpsell([
      item("cover-online", "covers", { availability: "in_stock", online_stock: 2 }),
      item("cover-store", "covers", { availability: "in_stock", store_stock: 1 }),
    ], 1);
    expect(picked.map((p) => p.id)).toEqual(["cover-store"]);
  });
});
