import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const searchProducts = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/product-queries", () => ({ searchProducts }));

import { GET } from "../route";
import { buildSuggestShortcuts, sanitizeSuggestQuery } from "../suggest";

function template(i: number) {
  return {
    id: `t${i}`, slug: `iphone-13-${i}`, display_name: `iPhone 13 nr. ${i}`, brand: "Apple", category: "iphone",
    images: [`https://cdn.example/t${i}.png`], min_price: 299900 + i * 100, base_price_a: 399900, base_price_b: null, base_price_c: null,
    storage_options: ["128 GB"], status: "published", description: null,
    // Interne felter, der aldrig må komme med i svaret.
    supplier: "Foxway", source: "dropship", foxway_product_id: "FX-1", is_dropship: true,
  };
}
const sku = {
  id: "s1", slug: "cover-13", title: "Cover til iPhone 13", brand: "Swissten", category: "accessory", subcategory: "cover",
  images: ["https://cdn.example/s1.png"], selling_price: 14900, sale_price: 9900, status: "published",
  supplier: "Foxway", dropship_supplier: "foxway",
};

const request = (query: string) => new NextRequest(`https://phonespot.dk/api/search?${query}`);

beforeEach(() => {
  searchProducts.mockReset();
  searchProducts.mockResolvedValue({ templates: Array.from({ length: 7 }, (_, i) => template(i)), skuProducts: [sku] });
});

describe("GET /api/search?suggest=1", () => {
  it("returns at most `limit` lean products plus shortcuts, with the cache header", async () => {
    const res = await GET(request("suggest=1&limit=5&q=iphone%2013"));
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    const body = await res.json();
    expect(body.products).toHaveLength(5);
    expect(body.products[0]).toEqual({
      type: "product", kind: "device", title: "iPhone 13 nr. 0", href: "/refurbished/iphone-13-0",
      image: "https://cdn.example/t0.png", priceOere: 299900,
    });
    expect(body.shortcuts).toEqual([
      { type: "category", label: "iPhones", href: "/iphones" },
      { type: "sell", label: "Sælg iPhone 13", href: "/saelg-din-enhed/iphone/iphone-13" },
    ]);
  });

  it("caps the limit and uses the sale price for accessories like the search page", async () => {
    searchProducts.mockResolvedValue({ templates: [], skuProducts: [sku] });
    const body = await (await GET(request("suggest=1&limit=999&q=cover"))).json();
    expect(body.products).toEqual([{ type: "product", kind: "accessory", title: "Cover til iPhone 13", href: "/tilbehoer/covers/cover-13", image: "https://cdn.example/s1.png", priceOere: 9900 }]);
  });

  it("never outputs supplier fields", async () => {
    const res = await GET(request("suggest=1&q=iphone"));
    const text = (await res.text()).toLowerCase();
    expect(text).not.toContain("foxway");
    expect(text).not.toContain("dropship");
    expect(text).not.toContain("supplier");
  });

  it("strips wildcards and caps the query before it reaches the database", async () => {
    await GET(request(`suggest=1&q=${encodeURIComponent("  ip*hone%_13\\  ")}`));
    expect(searchProducts).toHaveBeenCalledWith("ip hone 13");
    searchProducts.mockClear();
    await GET(request(`suggest=1&q=${"a".repeat(300)}`));
    expect(searchProducts.mock.calls[0][0]).toHaveLength(100);
  });

  it("does not query for fewer than two characters", async () => {
    const body = await (await GET(request("suggest=1&q=%2A%20i"))).json();
    expect(body).toEqual({ products: [], shortcuts: [] });
    expect(searchProducts).not.toHaveBeenCalled();
  });

  it("fails quietly without caching", async () => {
    searchProducts.mockRejectedValue(new Error("db down"));
    const res = await GET(request("suggest=1&q=iphone"));
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ products: [], shortcuts: [] });
  });

  it("leaves the existing full search response unchanged", async () => {
    const res = await GET(request("q=iphone"));
    expect(res.headers.get("Cache-Control")).toBeNull();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("suggest helpers", () => {
  it("sanitizes control characters and wildcards", () => {
    expect(sanitizeSuggestQuery("a\u0000b*c%d_e")).toBe("a b c d e");
    expect(sanitizeSuggestQuery(null)).toBe("");
  });

  it("matches shortcuts deterministically from static data", () => {
    expect(buildSuggestShortcuts("sælg iphone 13 pro")).toEqual([
      { type: "sell", label: "Sælg iPhone 13 Pro", href: "/saelg-din-enhed/iphone/iphone-13-pro" },
      { type: "category", label: "iPhones", href: "/iphones" },
      { type: "category", label: "Sælg din enhed", href: "/saelg-din-enhed" },
    ]);
    expect(buildSuggestShortcuts("iphone xr")).toContainEqual({ type: "sell", label: "Sælg iPhone XR", href: "/saelg-din-enhed/iphone/iphone-x" });
    expect(buildSuggestShortcuts("iphone 7").some((s) => s.type === "sell")).toBe(false);
    expect(buildSuggestShortcuts("cover")).toEqual([{ type: "category", label: "Tilbehør", href: "/tilbehoer" }]);
    expect(buildSuggestShortcuts("xyz")).toEqual([]);
  });
});
