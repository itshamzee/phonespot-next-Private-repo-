// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  insertedLinks: [] as Record<string, unknown>[],
  linkError: null as null | { message: string },
}));

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/platform/activity-log", () => ({ logActivity: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "sku_products") {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({ single: async () => ({ data: { id: "new", ...row }, error: null }) }),
          }),
        };
      }
      if (table === "sku_product_templates") {
        return { insert: async (rows: Record<string, unknown>[]) => { s.insertedLinks = rows; return { error: s.linkError }; } };
      }
      throw new Error(table);
    },
  }),
}));

import { POST } from "../route";

const call = (body: Record<string, unknown>) =>
  POST(new Request("https://x/api/platform/sku", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => { s.insertedLinks = []; s.linkError = null; });

it("gemmer de valgte 'passer til'-modeller ved oprettelse", async () => {
  const res = await call({ title: "Cover", selling_price: 34900, template_ids: ["t1", "t2", "t1"] });
  expect(res.status).toBe(201);
  expect(s.insertedLinks).toEqual([
    { sku_product_id: "new", template_id: "t1" },
    { sku_product_id: "new", template_id: "t2" },
  ]);
});

it("opretter uden koblinger når ingen modeller er valgt", async () => {
  const res = await call({ title: "Kabel", selling_price: 9900 });
  expect(res.status).toBe(201);
  expect(s.insertedLinks).toEqual([]);
});

it("fortæller det, hvis modellerne ikke kunne gemmes", async () => {
  s.linkError = { message: "fk violation" };
  const res = await call({ title: "Cover", selling_price: 34900, template_ids: ["t1"] });
  expect(res.status).toBe(201);
  expect((await res.json()).warning).toMatch(/passer til/i);
});
