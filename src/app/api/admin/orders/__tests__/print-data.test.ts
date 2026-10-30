// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/store-scope-server", () => ({
  requireStaffScope: vi.fn(async () => ({ staff: { id: "st-1" } })),
  canSee: () => true,
  resolveLocationSlug: async () => null,
  unauthorizedResponse: () => new Response("no", { status: 401 }),
}));
vi.mock("@/lib/accessory-intake/candidates", () => ({
  storeLocations: async () => [
    { id: "L-v", name: "Vejle", type: "store" },
    { id: "L-s", name: "Slagelse", type: "store" },
  ],
}));
const boxNumbersFor = vi.hoisted(() => vi.fn());
vi.mock("@/lib/lagersalg/boxes", () => ({ boxNumbersFor }));

const order = {
  id: "o1",
  order_number: "PS-1",
  location_id: null,
  customer: null,
  order_items: [{ id: "i1", device_id: null, sku_product_id: "A" }],
};
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from(table: string) {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        in: async () => ({
          data:
            table === "sku_products"
              ? [{ id: "A", title: "Cover", sku: "S-A", subcategory: "cover", attributes: { udsalg: "Ja" } }]
              : [],
        }),
        maybeSingle: async () => ({ data: order, error: null }),
      };
      return q;
    },
  }),
}));

import { GET } from "../[id]/print-data/route";

describe("GET /api/admin/orders/[id]/print-data", () => {
  it("svarer kassenumre pr. sku for ordrens location, Vejle når ordren ingen har", async () => {
    boxNumbersFor.mockResolvedValue(new Map([["A", [1, 3]]]));
    const res = await GET(new Request("http://x/api/admin/orders/o1/print-data") as never, {
      params: Promise.resolve({ id: "o1" }),
    });
    const body = await res.json();
    expect(body.boxes).toEqual({ A: [1, 3] });
    expect(body.skus[0].lagersalg).toBe(true);
    expect(body.skus[0]).not.toHaveProperty("attributes");
    expect(boxNumbersFor).toHaveBeenCalledWith(expect.anything(), ["A"], "L-v");
  });
});
