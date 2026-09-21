// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  sku: [] as Record<string, unknown>[],
  devices: [] as Record<string, unknown>[],
  templates: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const rows = table === "devices" ? s.devices : table === "product_templates" ? s.templates : s.sku;
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "neq", "in", "order"]) q[m] = () => q;
      q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
      return q;
    },
  }),
}));

import { GET } from "../route";

const items = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
const tag = (item: string, name: string) => item.match(new RegExp(`<g:${name}>([\\s\\S]*?)</g:${name}>`))?.[1]?.trim() ?? "";

beforeEach(() => {
  s.sku = [
    { id: "a1", title: "Cover", slug: "cover-til-iphone", subcategory: "cover", status: "published", is_active: true, images: ["https://x/1.webp"], selling_price: 19900, sale_price: null, brand: "Rixus", ean: null, product_number: "RIX1", description: "Tekst", short_description: "Kort" },
  ];
  s.templates = [
    { id: "t1", display_name: "Apple iPhone 15", brand: "Apple", category: "iphone", slug: "apple-iphone-15", status: "published", images: ["https://x/t1.webp"], short_description: "Kort" },
    { id: "t2", display_name: "HP EliteBook", brand: "HP", category: "laptop", slug: "hp-elitebook", status: "published", images: ["https://x/t2.webp"], short_description: "Kort" },
  ];
  s.devices = [
    { id: "d1", template_id: "t1", grade: "A", storage: "128GB", selling_price: 429900, photos: [], status: "listed" },
    { id: "d2", template_id: "t1", grade: "A", storage: "256GB", selling_price: 399900, photos: [], status: "listed" },
    { id: "d3", template_id: "t1", grade: "B", selling_price: 349900, photos: [], status: "listed" },
    { id: "d4", template_id: "t2", grade: "A", selling_price: 549900, photos: [], status: "listed" },
  ];
});

it("sender én vare pr. model og stand, ikke pr. eksemplar", async () => {
  const xml = await (await GET()).text();
  const devices = items(xml).filter((i) => tag(i, "link").includes("/refurbished/"));
  expect(devices).toHaveLength(3);
  const links = devices.map((i) => tag(i, "link"));
  expect(new Set(links).size).toBe(2);
});

it("tager den laveste pris blandt eksemplarerne i samme stand", async () => {
  const xml = await (await GET()).text();
  const a = items(xml).find((i) => tag(i, "id").startsWith("t1-A"));
  expect(tag(a!, "price")).toBe("3999.00 DKK");
  expect(tag(a!, "availability")).toBe("in_stock");
});

it("binder samme landingsside sammen med item_group_id", async () => {
  const xml = await (await GET()).text();
  const t1 = items(xml).filter((i) => tag(i, "link").endsWith("/apple-iphone-15"));
  expect(t1.every((i) => tag(i, "item_group_id") === "t1")).toBe(true);
});

it("giver bærbare deres egen Google-kategori", async () => {
  const xml = await (await GET()).text();
  const laptop = items(xml).find((i) => tag(i, "link").endsWith("/hp-elitebook"));
  expect(tag(laptop!, "google_product_category")).toMatch(/Laptops/);
  const phone = items(xml).find((i) => tag(i, "link").endsWith("/apple-iphone-15"));
  expect(tag(phone!, "google_product_category")).toMatch(/Mobile Phones/);
});

it("springer modeller uden billede over", async () => {
  s.templates = [{ ...s.templates[0], images: [] }, s.templates[1]];
  const xml = await (await GET()).text();
  expect(items(xml).some((i) => tag(i, "link").endsWith("/apple-iphone-15"))).toBe(false);
});

it("har stadig tilbehøret med, med rigtig kategori i linket", async () => {
  const xml = await (await GET()).text();
  const acc = items(xml).find((i) => tag(i, "id") === "a1");
  expect(tag(acc!, "link")).toBe("https://phonespot.dk/tilbehoer/covers/cover-til-iphone");
});
