// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { permanentRedirect, notFound, getTemplateBySlug, getSkuProductBySlug } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  getTemplateBySlug: vi.fn(),
  getSkuProductBySlug: vi.fn(),
}));
vi.mock("next/navigation", () => ({ permanentRedirect, notFound }));
vi.mock("@/lib/supabase/product-queries", () => ({
  getTemplateBySlug,
  getSkuProductBySlug,
  getPublishedSkuProducts: vi.fn(async () => []),
  getAvailableDevices: vi.fn(async () => []),
  getPublishedTemplates: vi.fn(async () => []),
}));

import ProductPage, { generateMetadata } from "../page";

const params = (collection: string, product: string) =>
  Promise.resolve({ collection, product });

beforeEach(() => {
  vi.clearAllMocks();
  getSkuProductBySlug.mockResolvedValue(null);
});

describe("[collection]/[product] device templates", () => {
  it.each([
    ["iphones", "apple-iphone-12-pro"],
    ["smartphones", "samsung-galaxy-s23"],
    ["ipads", "apple-ipad-9"],
    ["iphone-13-mini-reservedele", "apple-iphone-13-mini"],
  ])("/%s/%s redirecter permanent til /refurbished/<slug>", async (collection, slug) => {
    getTemplateBySlug.mockResolvedValue({ id: "t1", slug });
    await expect(ProductPage({ params: params(collection, slug) })).rejects.toThrow(
      `REDIRECT:/refurbished/${slug}`,
    );
    expect(permanentRedirect).toHaveBeenCalledWith(`/refurbished/${slug}`);
  });

  it("metadata peger canonical på /refurbished/<slug>", async () => {
    getTemplateBySlug.mockResolvedValue({ id: "t1", slug: "apple-iphone-12-pro" });
    const md = await generateMetadata({ params: params("iphones", "apple-iphone-12-pro") });
    expect(md.alternates?.canonical).toBe("https://phonespot.dk/refurbished/apple-iphone-12-pro");
  });

  it("ukendt slug giver 404, ikke redirect", async () => {
    getTemplateBySlug.mockResolvedValue(null);
    await expect(ProductPage({ params: params("iphones", "findes-ikke") })).rejects.toThrow(
      "NOT_FOUND",
    );
    expect(permanentRedirect).not.toHaveBeenCalled();
  });
});
