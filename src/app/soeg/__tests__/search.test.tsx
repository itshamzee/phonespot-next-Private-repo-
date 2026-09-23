import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SearchPage, { generateMetadata } from "../page";
import type { ProductTemplate, SkuProduct } from "@/lib/supabase/platform-types";
import { ProductCard } from "@/components/product/product-card";
import { skuProductToProduct } from "@/lib/supabase/product-adapter";
const search = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/product-queries", () => ({ searchProducts: search }));
afterEach(cleanup);
beforeEach(() => { search.mockReset(); });
const template: ProductTemplate = {
  id: "template", brand: "Apple", model: "iPhone 13", category: "iphone", display_name: "iPhone 13",
  slug: "iphone-13", storage_options: ["128 GB"], colors: [], default_attributes: {}, description: null, images: [],
  short_description: null, meta_title: null, meta_description: null, specifications: {}, status: "published",
  base_price_a: 249900, base_price_b: null, base_price_c: null, base_price_n: null, base_price_p: null,
  new_price: null, created_at: "", updated_at: "",
};
const sku: SkuProduct = {
  id: "sku", title: "Cover til iPhone", slug: "cover-iphone", category: "accessory", subcategory: "cover",
  description: null, ean: null, product_number: null, cost_price: null, selling_price: 14900, sale_price: null,
  brand: "PhoneSpot", supplier_id: null, images: [], is_active: true, short_description: null,
  meta_title: null, meta_description: null, variants: [], barcode: null, status: "published",
  always_in_stock: false, created_at: "", updated_at: "",
};
it("preserves the collection-based card URL when no explicit destination is supplied", () => {
  render(<ProductCard product={skuProductToProduct(sku)} collectionHandle="covers" />);
  expect(screen.getByRole("link", { name: /Se produkt/ })).toHaveAttribute("href", "/covers/cover-iphone");
});
it("links templates to refurbished and accessories through the category mapping", async () => {
  search.mockResolvedValue({ templates: [template], skuProducts: [sku] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: " iPhone " }) }));
  expect(screen.getByRole("link", { name: /iPhone 13.*Se produkt/ })).toHaveAttribute("href", "/refurbished/iphone-13");
  expect(screen.getByRole("link", { name: /Cover til iPhone.*Se produkt/ })).toHaveAttribute("href", "/tilbehoer/covers/cover-iphone");
  expect(search).toHaveBeenCalledWith("iPhone");
});
it("routes a device SKU to the existing device collection route", async () => {
  search.mockResolvedValue({ templates: [], skuProducts: [{ ...sku, category: "smartphone", subcategory: null, title: "OnePlus 10", slug: "oneplus-10" }] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: "OnePlus" }) }));
  expect(screen.getByRole("link", { name: /OnePlus 10.*Se produkt/ })).toHaveAttribute("href", "/smartphones/oneplus-10");
});
it("does not infer accessory category from a misleading product title", async () => {
  search.mockResolvedValue({ templates: [], skuProducts: [{ ...sku, title: "Cover oplader navn", subcategory: "cable" }] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: "kabel" }) }));
  expect(screen.getByRole("link", { name: /Cover oplader navn.*Se produkt/ })).toHaveAttribute("href", "/tilbehoer/opladere/cover-iphone");
});
it("falls back to the accessory detail route for an unmapped subcategory (there is no /tilbehor route)", async () => {
  search.mockResolvedValue({ templates: [], skuProducts: [{ ...sku, subcategory: "uncategorized" }] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: "glas" }) }));
  expect(screen.getByRole("link", { name: /Cover til iPhone.*Se produkt/ })).toHaveAttribute("href", "/tilbehoer/andet/cover-iphone");
});
it("opens glass search results as ordinary accessory products", async () => {
  search.mockResolvedValue({ templates: [], skuProducts: [{ ...sku, title: "Spot Privacy", slug: "spot-privacy", subcategory: "spot-glass" }] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: "glas" }) }));
  expect(screen.getByRole("link", { name: /Spot Privacy.*Se produkt/ })).toHaveAttribute("href", "/tilbehoer/beskyttelsesglas/spot-privacy");
});
it("keeps a product without a slug visible without making an invalid product URL", async () => {
  search.mockResolvedValue({ templates: [], skuProducts: [{ ...sku, slug: null }] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: "cover" }) }));
  expect(screen.getByRole("heading", { name: "Cover til iPhone" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Spørg til produktet/ })).toHaveAttribute("href", "/kontakt");
  expect(screen.queryByRole("link", { name: /Se produkt/ })).not.toBeInTheDocument();
});
it("shows failure with the same query retry instead of zero results", async () => {
  search.mockRejectedValue(new Error("offline"));
  render(await SearchPage({ searchParams: Promise.resolve({ q: "iPhone & iPad" }) }));
  expect(screen.getByRole("alert")).toHaveTextContent("Søgningen kunne ikke gennemføres");
  expect(screen.queryByText(/Ingen resultater/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Prøv igen" })).toHaveAttribute("href", "/soeg?q=iPhone%20%26%20iPad");
});
it("distinguishes an empty query from an actual search without matches", async () => {
  const { unmount } = render(await SearchPage({ searchParams: Promise.resolve({}) }));
  expect(search).not.toHaveBeenCalled();
  expect(screen.queryByText(/Ingen resultater/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Søg" })).toBeInTheDocument();
  unmount();
  search.mockResolvedValue({ templates: [], skuProducts: [] });
  render(await SearchPage({ searchParams: Promise.resolve({ q: "ukendt" }) }));
  expect(screen.getByText(/Ingen resultater/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it.each(["", "iPhone"])("sets its own canonical and noindex for query %s", async (q) => {
  const meta = await generateMetadata({ searchParams: Promise.resolve({ q }) });
  expect(meta.alternates?.canonical).toBe("https://phonespot.dk/soeg");
  expect(meta.robots).toMatchObject({ index: false, follow: true });
});
