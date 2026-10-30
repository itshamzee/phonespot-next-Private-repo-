// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  staff: { id: "st-1", role: "staff", location_slug: "vejle" } as { id: string } | null,
  canSee: vi.fn(),
  resolveLocationSlug: vi.fn(),
  boxesForOrderSkus: vi.fn(),
}));

vi.mock("@/lib/auth/store-scope-server", () => ({
  requireStaffScope: async () => (m.staff ? { staff: m.staff, scope: "vejle" } : null),
  canSee: m.canSee,
  resolveLocationSlug: m.resolveLocationSlug,
  unauthorizedResponse: () => new Response("no", { status: 401 }),
}));
vi.mock("@/lib/lagersalg/order-boxes", () => ({ boxesForOrderSkus: m.boxesForOrderSkus }));

const order = {
  id: "o1",
  order_number: "PS-1",
  status: "confirmed",
  total: 10000,
  subtotal: 10000,
  shipping_cost: 0,
  discount_amount: 0,
  bundle_discount_amount: 0,
  shipping_method: "postnord",
  shipping_address: {},
  tracking_number: null,
  tracking_url: null,
  notes: null,
  created_at: "2026-10-30T10:00:00Z",
  confirmed_at: null,
  location_id: "L-s",
  customer: { name: "Kunde", email: null, phone: null },
  order_items: [
    { id: "i1", item_type: "sku_product", device_id: null, sku_product_id: "A", quantity: 1, unit_price: 10000, total_price: 10000, discount_amount: 0 },
  ],
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        single: async () =>
          table === "orders"
            ? { data: order, error: null }
            : { data: { title: "Cover", images: [], subcategory: "cover", attributes: { udsalg: "Ja" } }, error: null },
      };
      return q;
    },
  }),
}));

import { GET } from "../packing-slip/route";

const req = () =>
  Object.assign(new Request("http://x/api/pos/packing-slip?order_id=o1"), {
    nextUrl: new URL("http://x/api/pos/packing-slip?order_id=o1"),
  }) as never;

beforeEach(() => {
  m.staff = { id: "st-1" };
  m.canSee.mockReset();
  m.resolveLocationSlug.mockReset().mockResolvedValue("slagelse");
  m.boxesForOrderSkus.mockReset().mockResolvedValue({ locationId: "L-s", boxes: { A: [1] }, lagersalg: { A: true } });
});

describe("GET /api/pos/packing-slip", () => {
  it("401 uden personale", async () => {
    m.staff = null;
    expect((await GET(req())).status).toBe(401);
  });

  it("404 for en ordre i en anden butik, før kasseopslag og HTML", async () => {
    m.canSee.mockReturnValue(false);
    const res = await GET(req());
    expect(res.status).toBe(404);
    expect(m.resolveLocationSlug).toHaveBeenCalledWith("L-s");
    expect(m.boxesForOrderSkus).not.toHaveBeenCalled();
    expect(await res.text()).not.toContain("<html");
  });

  it("200 HTML med kassenummer fra ordrens pluk og de rigtige vareattributter", async () => {
    m.canSee.mockReturnValue(true);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(await res.text()).toContain("Kasse 01");
    expect(m.boxesForOrderSkus).toHaveBeenCalledWith(expect.anything(), {
      orderId: "o1",
      orderLocationId: "L-s",
      skus: [{ id: "A", subcategory: "cover", attributes: { udsalg: "Ja" } }],
    });
  });
});
