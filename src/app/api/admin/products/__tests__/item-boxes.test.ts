// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  allowed: true,
  product: {} as Record<string, unknown>,
  boxStock: [] as unknown[],
  current: [] as unknown[],
  upserts: [] as { table: string; rows: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => ({ id: "st-1", role: "intern", location_slug: "vejle" })),
}));
vi.mock("@/lib/auth/store-scope", () => ({ canAccessStore: (_s: unknown, store: string) => s.allowed && store === "vejle" }));
vi.mock("@/lib/accessory-intake/candidates", () => ({
  storeLocations: async () => [{ id: "L-v", name: "Vejle", type: "store" }, { id: "L-s", name: "Slagelse", type: "store" }],
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const q: Record<string, unknown> = {};
      const result = (): { data: unknown; error: null } => {
        if (table === "sku_products") return { data: s.product, error: null };
        if (table === "sale_boxes")
          return { data: [{ id: "b1", number: 1, status: "open" }, { id: "b3", number: 3, status: "closed" }], error: null };
        if (table === "sku_box_stock") return { data: s.current, error: null };
        return { data: [], error: null };
      };
      for (const k of ["select", "eq", "gt", "in"]) q[k] = () => q;
      q.maybeSingle = async () => result();
      q.update = () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "p1", title: "T", slug: "t", subcategory: "case", status: "draft" }, error: null }) }) }) });
      q.upsert = async (rows: unknown) => { s.upserts.push({ table, rows }); return { error: null }; };
      q.then = (res: (v: unknown) => unknown) => res(result());
      return q;
    },
  }),
}));

import { GET, PUT } from "../[id]/route";

const params = { params: Promise.resolve({ id: "p1" }) };
const put = (body: Record<string, unknown>) =>
  PUT(new NextRequest("https://x/api/admin/products/p1", { method: "PUT", body: JSON.stringify({ title: "T", subcategory: "case", sellingPrice: 10000, ...body }) }), params);

beforeEach(() => {
  s.allowed = true;
  s.upserts = [];
  s.product = { id: "p1", category: "accessory", subcategory: "case", slug: "t", status: "draft", attributes: { udsalg: "Ja" }, specifications: null, compatible_models: [] };
  s.current = [{ box_id: "b1", quantity: 3 }, { box_id: "b3", quantity: 2 }];
});

describe("kasser på produktet", () => {
  it("GET svarer kasser pr. butik og nummer", async () => {
    s.current = [
      { quantity: 3, sale_boxes: { number: 1, locations: { name: "Vejle" } } },
      { quantity: 2, sale_boxes: { number: 3, locations: { name: "Vejle" } } },
    ];
    const body = await (await GET(new NextRequest("https://x/api/admin/products/p1"), params)).json();
    expect(body.boxes).toEqual({ vejle: { "1": 3, "3": 2 } });
  });

  it("PUT sætter angivne kasser og nulstiller udeladte", async () => {
    const res = await put({ boxes: { vejle: { "1": 5 } } });
    expect(res.status).toBe(200);
    const box = s.upserts.find((u) => u.table === "sku_box_stock");
    expect(box?.rows).toEqual([
      { product_id: "p1", box_id: "b1", quantity: 5 },
      { product_id: "p1", box_id: "b3", quantity: 0 },
    ]);
  });

  it("PUT afviser ukendt kasse, lukket kasse der fyldes, ikke-lagersalg og andre butikker", async () => {
    expect((await put({ boxes: { vejle: { "9": 1 } } })).status).toBe(400);
    expect((await put({ boxes: { vejle: { "3": 4 } } })).status).toBe(409);
    expect((await put({ boxes: { slagelse: { "1": 1 } } })).status).toBe(403);
    s.product = { ...s.product, attributes: {} };
    expect((await put({ boxes: { vejle: { "1": 1 } } })).status).toBe(400);
    expect(s.upserts).toEqual([]);
  });
});
