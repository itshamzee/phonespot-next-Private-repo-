// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  source: null as null | Record<string, unknown>,
  existingSlugs: [] as string[],
  inserted: null as null | Record<string, unknown>,
  links: [{ template_id: "t1" }],
  insertedLinks: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "sku_products") {
        return {
          select: (cols: string) => ({
            eq: () => ({ maybeSingle: async () => ({ data: s.source, error: null }) }),
            like: async () => ({ data: s.existingSlugs.map((slug) => ({ slug })) }),
            _cols: cols,
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({ single: async () => { s.inserted = row; return { data: { id: "new", title: row.title, slug: row.slug }, error: null }; } }),
          }),
        };
      }
      if (table === "sku_product_templates") {
        return {
          select: () => ({ eq: async () => ({ data: s.links }) }),
          insert: async (rows: Record<string, unknown>[]) => { s.insertedLinks = rows; return { error: null }; },
        };
      }
      throw new Error(table);
    },
  }),
}));

import { POST } from "../[id]/duplicate/route";

const call = () => POST(new NextRequest("https://x/api/admin/products/p1/duplicate", { method: "POST" }), { params: Promise.resolve({ id: "p1" }) });

beforeEach(() => {
  s.source = {
    id: "p1", title: "Cover", slug: "cover", ean: "123", barcode: "b", product_number: "pn", status: "published",
    created_at: "x", updated_at: "y", search_vector: "sv", images: ["a.jpg"], attributes: { case_type: "Clear" },
    compatible_models: ["iphone-17"], selling_price: 100, category: "accessory", subcategory: "cover",
  };
  s.existingSlugs = ["cover-kopi"];
  s.inserted = null;
  s.insertedLinks = [];
});

it("kopierer som kladde uden identitet/unikke felter og med nyt slug", async () => {
  const res = await call();
  expect(res.status).toBe(201);
  expect(await res.json()).toEqual({ id: "new", title: "Cover (kopi)", slug: "cover-kopi-2" });
  expect(s.inserted).toMatchObject({ title: "Cover (kopi)", status: "draft", slug: "cover-kopi-2", images: ["a.jpg"], attributes: { case_type: "Clear" }, compatible_models: ["iphone-17"] });
  for (const k of ["id", "ean", "barcode", "product_number", "created_at", "updated_at", "search_vector"]) expect(s.inserted).not.toHaveProperty(k);
  expect(s.insertedLinks).toEqual([{ sku_product_id: "new", template_id: "t1" }]);
});

it("svarer 404 når produktet ikke findes", async () => {
  s.source = null;
  expect((await call()).status).toBe(404);
});
