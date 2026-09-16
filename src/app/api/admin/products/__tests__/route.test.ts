// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  existingSlugs: [] as string[],
  inserted: [] as Record<string, unknown>[],
  stock: [] as Record<string, unknown>[],
  insertError: null as null | { message: string },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "sku_products") {
        return {
          select: () => ({
            or: async () => ({ data: s.existingSlugs.map((slug) => ({ slug })), error: null }),
          }),
          insert: (rows: Record<string, unknown>[]) => ({
            select: async () => {
              if (s.insertError) return { data: null, error: s.insertError };
              s.inserted = rows.map((r, i) => ({ ...r, id: `id-${i}` }));
              return { data: s.inserted, error: null };
            },
          }),
        };
      }
      if (table === "locations") {
        return {
          select: async () => ({
            data: [
              { id: "online", name: "Online", type: "online" },
              { id: "vejle", name: "Vejle", type: "store" },
              { id: "slagelse", name: "Slagelse", type: "store" },
            ],
            error: null,
          }),
        };
      }
      if (table === "sku_stock") {
        return {
          upsert: async (rows: Record<string, unknown>[]) => {
            s.stock = rows;
            return { error: null };
          },
        };
      }
      throw new Error(`uventet tabel ${table}`);
    },
  }),
}));

import { POST } from "../route";

function post(body: unknown) {
  return POST(new NextRequest("https://example.com/api/admin/products", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  s.existingSlugs = [];
  s.inserted = [];
  s.stock = [];
  s.insertError = null;
});

it("opretter tilbehør pr. model som published, aktivt og med kompatible modeller og lager", async () => {
  const res = await post({
    type: "accessory",
    items: [{
      title: "Swissten Clear Cover {model}",
      subcategory: "cover",
      brand: "Swissten",
      models: ["iphone-17-pro", "iphone-17"],
      mode: "per-model",
      sellingPrice: 19900,
      images: ["https://cdn/x.jpg"],
      attributes: { case_type: "Clear" },
      stock: { online: 10, stores: { vejle: 2 } },
    }],
  });
  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.count).toBe(2);
  expect(body.created[0]).toMatchObject({ slug: "swissten-clear-cover-iphone-17-pro", url: "/tilbehoer/covers/swissten-clear-cover-iphone-17-pro" });
  expect(s.inserted[0]).toMatchObject({ status: "published", is_active: true, compatible_models: ["iphone-17-pro"], attributes: { case_type: "Clear" } });
  expect(s.stock).toEqual([
    { product_id: "id-0", location_id: "online", quantity: 10 },
    { product_id: "id-0", location_id: "vejle", quantity: 2 },
    { product_id: "id-1", location_id: "online", quantity: 10 },
    { product_id: "id-1", location_id: "vejle", quantity: 2 },
  ]);
});

it("giver slugs løbenummer når de allerede findes", async () => {
  s.existingSlugs = ["usb-c-kabel-2m", "usb-c-kabel-2m-2"];
  const res = await post({
    type: "accessory",
    items: [{ title: "USB-C kabel 2m", subcategory: "cable", sellingPrice: 9900, images: [] }],
  });
  expect(res.status).toBe(201);
  expect((await res.json()).created[0].slug).toBe("usb-c-kabel-2m-3");
});

it("afviser ukendt model med dansk fejltekst uden at oprette noget", async () => {
  const res = await post({
    type: "accessory",
    items: [{ title: "Cover {model}", subcategory: "cover", models: ["iphone-99"], mode: "per-model", sellingPrice: 9900, images: [] }],
  });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toMatch(/iphone-99/);
  expect(s.inserted).toEqual([]);
});

it("afviser ugyldig krop", async () => {
  const res = await post({ type: "accessory", items: [{ title: "", subcategory: "cover", sellingPrice: "dyr" }] });
  expect(res.status).toBe(400);
});

it("opretter reservedel med begge kategorifelter og uden lager når intet er angivet", async () => {
  const res = await post({
    type: "spare-part",
    items: [{ title: "iPhone 13 skærm", sellingPrice: 89900, partCategoryId: "cat", deviceBrand: "Apple", deviceModel: "iPhone 13", images: [] }],
  });
  expect(res.status).toBe(201);
  expect(s.inserted[0]).toMatchObject({ category: "spare-part", subcategory: "spare-part", part_category_id: "cat", status: "published" });
  expect(s.stock).toEqual([]);
});

it("melder databasefejl som 500", async () => {
  s.insertError = { message: "duplicate key" };
  const res = await post({ type: "accessory", items: [{ title: "Kabel", subcategory: "cable", sellingPrice: 100, images: [] }] });
  expect(res.status).toBe(500);
});
