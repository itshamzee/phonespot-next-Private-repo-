// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
const s = vi.hoisted(() => ({
  error: false,
  empty: false,
  calls: [] as string[],
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      s.calls.push(table);
      let store = false;
      const q: Record<string, unknown> = {};
      for (const method of ["eq", "neq", "order", "in", "ilike", "or"])
        q[method] = () => q;
      q.gt = (field: string) => {
        s.calls.push("gt:" + field);
        store = true;
        return q;
      };
      q.limit = () => {
        s.calls.push("limit");
        return q;
      };
      q.select = () => q;
      q.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          error: s.error ? {} : null,
          data: s.error
            ? null
            : s.empty
              ? []
              : table === "checkout_sku_inventory"
                ? [
                    {
                      id: "physical",
                      title: "Cover",
                      images: [],
                      store_stock: 3,
                      online_stock: 5,
                    },
                    {
                      id: "order",
                      title: "Order",
                      images: [],
                      store_stock: 0,
                      online_stock: 0,
                      always_in_stock: true,
                    },
                  ].filter((p) => !store || p.store_stock > 0)
                : [],
        });
      return q;
    },
  }),
}));
beforeEach(() => {
  s.error = false;
  s.empty = false;
  s.calls = [];
});
it("filters store stock in database before limit without stock ID lists", async () => {
  const r = await GET(
    new NextRequest("https://example.com/api/accessories?inStore=true"),
  );
  expect(await r.json()).toMatchObject([
    {
      id: "physical",
      store_stock: 3,
      online_stock: 5,
      availability: "in_stock",
    },
  ]);
  expect(s.calls).toEqual([
    "checkout_sku_inventory",
    "gt:store_stock",
    "limit",
  ]);
});
it("preserves public mapping and orderable contract", async () => {
  const rows = await (
    await GET(new NextRequest("https://example.com/api/accessories"))
  ).json();
  expect(rows[1].availability).toBe("orderable");
  expect(JSON.stringify(rows)).not.toMatch(/cost_price|reservation_owner/);
});
it.each(["", "?inStore=true"])("query failure is 503 %s", async (query) => {
  s.error = true;
  expect(
    (await GET(new NextRequest("https://example.com/api/accessories" + query)))
      .status,
  ).toBe(503);
});
it("legitimate empty result is 200 []", async () => {
  s.empty = true;
  const r = await GET(
    new NextRequest("https://example.com/api/accessories?inStore=true"),
  );
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual([]);
});
