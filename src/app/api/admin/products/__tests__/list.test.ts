// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  calls: [] as { method: string; args: unknown[] }[],
  rows: [{ id: "a", title: "Cover", total_stock: 2 }] as Record<string, unknown>[],
  count: 1,
  error: null as null | { message: string },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "or", "ilike", "gt", "order"]) {
      q[m] = (...args: unknown[]) => { s.calls.push({ method: m, args }); return q; };
    }
    q.range = async (...args: unknown[]) => { s.calls.push({ method: "range", args }); return { data: s.rows, error: s.error, count: s.count }; };
    return { from: (table: string) => { s.calls.push({ method: "from", args: [table] }); return q; } };
  },
}));

import { GET } from "../route";

beforeEach(() => { s.calls = []; s.error = null; });

const get = (qs: string) => GET(new NextRequest(`https://x/api/admin/products?${qs}`));

it("læser fra lager-viewet, filtrerer tilbehør og paginerer", async () => {
  const res = await get("type=accessory&page=2&limit=25");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ items: s.rows, total: 1, page: 2, limit: 25 });
  expect(s.calls.find((c) => c.method === "from")?.args).toEqual(["checkout_sku_inventory"]);
  expect(s.calls).toContainEqual({ method: "eq", args: ["category", "accessory"] });
  expect(s.calls).toContainEqual({ method: "neq", args: ["subcategory", "spare-part"] });
  expect(s.calls).toContainEqual({ method: "range", args: [25, 49] });
});

it("oversætter lager- og statusfiltre og begrænser limit til 100", async () => {
  await get("type=spare-part&stock=in&status=draft&brand=Swissten&subcategory=cover&limit=500&search=kabel");
  expect(s.calls).toContainEqual({ method: "eq", args: ["category", "spare-part"] });
  expect(s.calls).toContainEqual({ method: "gt", args: ["total_stock", 0] });
  expect(s.calls).toContainEqual({ method: "eq", args: ["status", "draft"] });
  expect(s.calls).toContainEqual({ method: "ilike", args: ["brand", "Swissten"] });
  expect(s.calls).toContainEqual({ method: "eq", args: ["subcategory", "cover"] });
  expect(s.calls).toContainEqual({ method: "range", args: [0, 99] });
  expect(s.calls.find((c) => c.method === "or")?.args[0]).toContain("kabel");
});

it("svarer 503 ved databasefejl", async () => {
  s.error = { message: "boom" };
  expect((await get("type=accessory")).status).toBe(503);
});
