import { beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ responses: {} as Record<string, { data: unknown[] | null; error: { message: string } | null }> }));
vi.mock("../admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = { select: () => query, eq: () => query, textSearch: () => query, limit: async () => fixture.responses[table] };
      return query;
    },
  }),
}));
import { searchProducts } from "../product-queries";
beforeEach(() => {
  fixture.responses = { product_templates: { data: [], error: null }, sku_products: { data: [], error: null } };
});
it.each(["product_templates", "sku_products"])("propagates a %s database error to the search page", async (table) => {
  fixture.responses[table] = { data: null, error: { message: "unavailable" } };
  await expect(searchProducts("iPhone")).rejects.toEqual({ message: "unavailable" });
});
it("preserves an actual zero-result response", async () => {
  await expect(searchProducts("ukendt")).resolves.toEqual({ templates: [], skuProducts: [] });
});
