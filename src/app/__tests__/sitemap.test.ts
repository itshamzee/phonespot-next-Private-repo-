// @vitest-environment node
import { expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/product-queries", () => ({
  getPublishedTemplates: async () => [],
  getPublishedSkuProducts: async () => [
    { slug: "cover-sort", category: "accessory", subcategory: "cover" },
    { slug: "iphone-13-skaerm", category: "accessory", subcategory: "spare-part" },
    { slug: "macbook-batteri", category: "spare-part", subcategory: null },
  ],
}));
vi.mock("@/lib/blog", () => ({ getAllPosts: () => [] }));
vi.mock("@/lib/supabase/repairs", () => ({ getActiveBrands: async () => [], getAllModelSlugs: async () => [] }));
vi.mock("@/lib/spot/queries", () => ({ fetchActiveSpotSkus: async () => [] }));

import sitemap from "../sitemap";

it("lists no /reservedele pages and no spare-part products", async () => {
  const urls = (await sitemap()).map((e) => e.url);
  expect(urls.filter((u) => u.includes("/reservedele"))).toEqual([]);
  expect(urls.some((u) => u.includes("iphone-13-skaerm") || u.includes("macbook-batteri"))).toBe(false);
  expect(urls.some((u) => u.endsWith("/cover-sort"))).toBe(true);
});
