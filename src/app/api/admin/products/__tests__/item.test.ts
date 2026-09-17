// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  orderCount: 0,
  updated: null as null | Record<string, unknown>,
  deleted: [] as string[],
  updatePayload: null as null | Record<string, unknown>,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "order_items") {
        return { select: () => ({ eq: async () => ({ count: s.orderCount, error: null }) }) };
      }
      if (table === "sku_products") {
        return {
          update: (payload: Record<string, unknown>) => { s.updatePayload = payload; return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: s.updated, error: null }) }) }) }; },
          delete: () => ({ eq: (_f: string, id: string) => ({ select: () => ({ maybeSingle: async () => { s.deleted.push(id); return { data: { id, category: "accessory" }, error: null }; } }) }) }),
        };
      }
      return { delete: () => ({ eq: async (_f: string, id: string) => { s.deleted.push(`${table}:${id}`); return { error: null }; } }) };
    },
  }),
}));

import { DELETE, PATCH } from "../[id]/route";

const params = { params: Promise.resolve({ id: "p1" }) };
beforeEach(() => { s.orderCount = 0; s.deleted = []; s.updatePayload = null; s.updated = { id: "p1", status: "draft", category: "accessory" }; });

it("PATCH gemmer kun tilladte felter", async () => {
  const res = await PATCH(new NextRequest("https://x/api/admin/products/p1", { method: "PATCH", body: JSON.stringify({ status: "draft", title: "hack" }) }), params);
  expect(res.status).toBe(400);
  const ok = await PATCH(new NextRequest("https://x/api/admin/products/p1", { method: "PATCH", body: JSON.stringify({ status: "draft" }) }), params);
  expect(ok.status).toBe(200);
  expect(s.updatePayload).toMatchObject({ status: "draft" });
});

it("DELETE afviser produkter der findes på ordrer", async () => {
  s.orderCount = 3;
  const res = await DELETE(new NextRequest("https://x/api/admin/products/p1", { method: "DELETE" }), params);
  expect(res.status).toBe(409);
  expect(s.deleted).toEqual([]);
});

it("DELETE fjerner lager, links og produktet når det aldrig er solgt", async () => {
  const res = await DELETE(new NextRequest("https://x/api/admin/products/p1", { method: "DELETE" }), params);
  expect(res.status).toBe(200);
  expect(s.deleted).toEqual(["sku_stock:p1", "sku_product_templates:p1", "p1"]);
});
