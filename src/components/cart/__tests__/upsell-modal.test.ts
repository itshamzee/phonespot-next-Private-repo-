import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/cart/cart-context", () => ({ useCart: () => ({}) }));
import { toSuggestion } from "../upsell-modal";
import type { PublicAccessory } from "@/lib/product/public-accessory";

const base: PublicAccessory = {
  id: "c1", name: "Cover", slug: "cover", category: "covers", brand: null, price: 19900, sale_price: 14900,
  image_url: "/c.png", created_at: "", store_stock: 1, online_stock: 0, availability: "in_stock", lagersalg: false,
};

describe("toSuggestion", () => {
  it("bærer lagersalg-flaget videre", () => {
    expect(toSuggestion({ ...base, lagersalg: true })).toMatchObject({ id: "c1", price: 14900, lagersalg: true });
  });
  it("udelader flaget for almindelige varer", () => {
    expect(toSuggestion(base)).not.toHaveProperty("lagersalg");
  });
});
