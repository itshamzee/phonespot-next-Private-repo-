import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const products = vi.hoisted(() => [
  { id: "glass", title: "Spot Normal", slug: "spot-normal", subcategory: "spot-glass", category: "accessory", status: "published", is_active: true, selling_price: 19900, images: [], compatible_models: ["iphone-17-pro"], always_in_stock: true },
  { id: "privacy", title: "Spot Privacy", slug: "spot-privacy", subcategory: "spot-glass", category: "accessory", status: "published", is_active: true, selling_price: 24900, images: [], compatible_models: ["iphone-17-pro-max"], always_in_stock: true },
  { id: "cover", title: "Cover", slug: "cover", subcategory: "cover", category: "accessory", status: "published", is_active: true, selling_price: 14900, images: [], compatible_models: [], always_in_stock: true },
]);
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from(table: string) {
  let rows = table === "sku_products" ? [...products] : [];
  const q = {
    select: () => q, order: () => q, limit: () => q,
    eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key as keyof typeof row] === value); return q; },
    neq: (key: string, value: unknown) => { rows = rows.filter(row => row[key as keyof typeof row] !== value); return q; },
    in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key as keyof typeof row])); return q; },
    contains: (key: string, values: string[]) => { rows = rows.filter(row => values.every(value => (row[key as keyof typeof row] as string[]).includes(value))); return q; },
    ilike: () => q,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: rows, error: null })),
  };
  return q;
} }) }));

it("lists glass with ordinary accessories and routes to its product page", async () => {
  const rows = await (await GET(new NextRequest("https://example.com/api/accessories"))).json();
  expect(rows.map((row: {id: string}) => row.id)).toEqual(["glass", "privacy", "cover"]);
  expect(rows[0]).toMatchObject({ category: "beskyttelsesglas", compatible_models: ["iPhone 17 Pro"], spotKind: "glass" });
  expect(rows[1].spotKind).toBe("privacy");
});
it("includes Spot products in the glass category", async () => {
  const rows = await (await GET(new NextRequest("https://example.com/api/accessories?category=beskyttelsesglas"))).json();
  expect(rows.map((row: {id: string}) => row.id)).toEqual(["glass", "privacy"]);
});
it.each(["iphone-17-pro", "iPhone 17 Pro"])("filters exact compatibility without a template link: %s", async model => {
  const rows = await (await GET(new NextRequest(`https://example.com/api/accessories?model=${encodeURIComponent(model)}`))).json();
  expect(rows.map((row: {id: string}) => row.id)).toEqual(["glass"]);
});
