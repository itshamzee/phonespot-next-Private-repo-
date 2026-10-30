// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  allowed: true,
  open: null as null | Record<string, unknown>,
  stock: [] as unknown[],
  boxStock: [] as unknown[],
  boxes: [] as unknown[],
  upsert: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => ({ id: "st-1", role: "intern", location_slug: "vejle" })),
}));
vi.mock("@/lib/auth/store-scope", () => ({ canAccessStore: () => m.allowed }));
vi.mock("@/lib/accessory-intake/candidates", () => ({
  storeLocations: async () => [
    { id: "L-v", name: "Vejle", type: "store" },
    { id: "L-s", name: "Slagelse", type: "store" },
  ],
}));
vi.mock("@/lib/lagersalg/boxes", () => ({ currentOpenBox: vi.fn(async () => m.open) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const data = () => (table === "sku_stock" ? m.stock : table === "sku_box_stock" ? m.boxStock : m.boxes);
      const q: Record<string, unknown> = {};
      for (const k of ["select", "eq", "gt", "order"]) q[k] = () => q;
      q.range = async () => ({ data: data(), error: null });
      q.upsert = m.upsert;
      // sale_boxes-opslag (overview) afsluttes med order()
      if (table === "sale_boxes") q.order = async () => ({ data: m.boxes, error: null });
      return q;
    },
  }),
}));

import { POST } from "../boxes/assign-unboxed/route";
import { GET } from "../boxes/overview/route";

const post = (body: unknown) =>
  new Request("http://x/api/admin/lagersalg/boxes/assign-unboxed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const prod = (subcategory: string, udsalg: string) => ({ subcategory, attributes: { udsalg } });

beforeEach(() => {
  m.allowed = true;
  m.open = { id: "box2", number: 2, status: "open" };
  m.boxStock = [];
  m.boxes = [];
  m.upsert.mockClear();
  m.stock = [
    { product_id: "A", quantity: 4, sku_products: prod("case", "Ja") },
    { product_id: "B", quantity: 5, sku_products: prod("screen_protector", "Ja") },
    { product_id: "C", quantity: 3, sku_products: prod("case", "Nej") },
    { product_id: "D", quantity: 2, sku_products: prod("case", "Ja") },
  ];
  // D ligger allerede i kasse 1
  m.boxStock = [{ product_id: "D", box_id: "box1", quantity: 2 }];
});

describe("POST assign-unboxed", () => {
  it("lægger lagersalgsvarer uden kasse i den åbne kasse, glas og ikke-udsalg udeladt", async () => {
    const res = await POST(post({ store: "vejle" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ assigned: 1, box: expect.objectContaining({ number: 2 }) });
    expect(m.upsert).toHaveBeenCalledWith([{ product_id: "A", box_id: "box2", quantity: 4 }], expect.anything());
  });

  it("svarer 409 uden åben kasse", async () => {
    m.open = null;
    const res = await POST(post({ store: "vejle" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Ingen åben kasse i Vejle");
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("afviser en butik medarbejderen ikke har adgang til", async () => {
    m.allowed = false;
    expect((await POST(post({ store: "slagelse" }))).status).toBe(403);
    expect(m.upsert).not.toHaveBeenCalled();
  });
});

describe("GET overview", () => {
  it("tæller varer og stk. pr. kasse og antal uden kasse", async () => {
    m.boxes = [
      { id: "box2", number: 2, status: "open" },
      { id: "box1", number: 1, status: "closed" },
    ];
    const res = await GET(new Request("http://x/api/admin/lagersalg/boxes/overview?store=vejle"));
    expect(await res.json()).toEqual({
      boxes: [
        { id: "box2", number: 2, status: "open", lines: 0, units: 0 },
        { id: "box1", number: 1, status: "closed", lines: 1, units: 2 },
      ],
      unboxed: 1,
    });
  });
});
