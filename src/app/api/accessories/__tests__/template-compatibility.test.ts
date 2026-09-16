import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const fixtures = vi.hoisted(() => {
  const product = (id: string, compatible_models: string[] = []) => ({
    id, title: id, slug: id, subcategory: "cover", category: "accessory",
    brand: "PhoneSpot", selling_price: 14900, sale_price: null, images: [],
    always_in_stock: false, variant_label: null, status: "published",
    is_active: true, created_at: "2026-09-16T00:00:00Z", compatible_models,
  });
  return {
    sku_products: [
      product("template-12"), product("template-mini"), product("template-pro"),
      product("template-pro-max"), product("spot-12", ["iphone-12"]),
      product("spot-pro", ["iphone-12-pro"]), product("template-samsung"),
      product("template-google"), product("other-brand-12"),
    ],
    product_templates: [
      { id: "12", brand: "Apple", model: "iPhone 12", display_name: "Apple iPhone 12" },
      { id: "mini", brand: "Apple", model: "iPhone 12 mini", display_name: "Apple iPhone 12 mini" },
      { id: "pro", brand: "Apple", model: "iPhone 12 Pro", display_name: "Apple iPhone 12 Pro" },
      { id: "pro-max", brand: "Apple", model: "iPhone 12 Pro Max", display_name: "Apple iPhone 12 Pro Max" },
      { id: "samsung", brand: "Samsung", model: "Galaxy S25", display_name: "Samsung Galaxy S25" },
      { id: "google", brand: "Google", model: "Pixel 9", display_name: "Google Pixel 9" },
      { id: "other", brand: "Other", model: "iPhone 12", display_name: "Other iPhone 12" },
    ],
    sku_product_templates: [
      { sku_product_id: "template-12", template_id: "12" },
      { sku_product_id: "template-mini", template_id: "mini" },
      { sku_product_id: "template-pro", template_id: "pro" },
      { sku_product_id: "template-pro-max", template_id: "pro-max" },
      { sku_product_id: "template-samsung", template_id: "samsung" },
      { sku_product_id: "template-google", template_id: "google" },
      { sku_product_id: "other-brand-12", template_id: "other" },
    ],
    sku_stock: [],
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: keyof typeof fixtures | "checkout_sku_inventory") {
      let rows: Record<string, unknown>[] = table === "checkout_sku_inventory"
        ? fixtures.sku_products.map(product => ({ ...product, store_stock: 0, online_stock: 0 }))
        : [...fixtures[table]];
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        eq: (field: string, value: unknown) => {
          rows = rows.filter(row => row[field] === value);
          return query;
        },
        neq: (field: string, value: unknown) => {
          rows = rows.filter(row => row[field] !== value);
          return query;
        },
        in: (field: string, values: unknown[]) => {
          rows = rows.filter(row => values.includes(row[field]));
          return query;
        },
        contains: (field: string, values: string[]) => {
          rows = rows.filter(row => Array.isArray(row[field]) && values.every(value => (row[field] as string[]).includes(value)));
          return query;
        },
        ilike: (field: string, pattern: string) => {
          const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`, "i");
          rows = rows.filter(row => typeof row[field] === "string" && regex.test(row[field]));
          return query;
        },
        then: (resolve: (result: { data: Record<string, unknown>[]; error: null }) => unknown) =>
          Promise.resolve(resolve({ data: rows, error: null })),
      };
      return query;
    },
  }),
}));

async function idsFor(model: string): Promise<string[]> {
  const response = await GET(new NextRequest(`https://example.com/api/accessories?model=${encodeURIComponent(model)}`));
  expect(response.status).toBe(200);
  const rows = await response.json();
  return rows.map((row: { id: string }) => row.id);
}

it.each(["iPhone 12", "iphone-12"])("unites Apple template links and exact Spot compatibility for %s", async model => {
  expect(await idsFor(model)).toEqual(["template-12", "spot-12"]);
});

it.each(["iPhone 12 Pro", "iphone-12-pro"])("keeps Pro separate from base, Mini and Pro Max for %s", async model => {
  expect(await idsFor(model)).toEqual(["template-pro", "spot-pro"]);
});

it.each([
  ["samsung-s25", "template-samsung"],
  ["Galaxy S25", "template-samsung"],
  ["google-pixel-9", "template-google"],
])("matches brand-prefixed template display names through canonical model %s", async (model, id) => {
  expect(await idsFor(model)).toEqual([id]);
});
