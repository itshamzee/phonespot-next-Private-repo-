/* eslint-disable @next/next/no-img-element -- Plain images keep this route test focused on card destinations. */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ProductTemplate,
  SkuProduct,
} from "@/lib/supabase/platform-types";

const catalog = vi.hoisted(() => ({
  templates: [] as ProductTemplate[],
  skus: [] as SkuProduct[],
  skuDetail: null as SkuProduct | null,
}));

vi.mock("@/lib/supabase/product-queries", () => ({
  getPublishedTemplates: async () => catalog.templates,
  getPublishedSkuProducts: async () => catalog.skus,
  getSkuProductBySlug: async () => catalog.skuDetail,
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
vi.mock("@/components/product/image-gallery-with-grade", () => ({
  ImageGalleryWithGrade: () => null,
}));
vi.mock("@/components/product/product-info", () => ({ ProductInfo: () => null }));
vi.mock("@/components/product/product-details", () => ({
  ProductDetails: () => null,
}));
vi.mock("@/components/product/device-collection", () => ({
  DeviceCollectionDetails: () => null,
}));

import BrandPage from "@/app/baerbare/[brand]/page";

const template = {
  id: "template-laptop",
  slug: "lenovo-thinkpad-t14-g1",
  display_name: "Lenovo ThinkPad T14 G1",
  brand: "Lenovo",
  category: "laptop",
  images: ["/thinkpad.png"],
  storage_options: ["256GB"],
  base_price_a: 150000,
  base_price_b: null,
  base_price_c: null,
} as unknown as ProductTemplate;

const sku = {
  id: "sku-laptop",
  slug: "usb-c-laptop-dock",
  title: "USB-C laptop dock",
  brand: "PhoneSpot",
  category: "laptop",
  images: ["/dock.png"],
  selling_price: 160000,
  sale_price: null,
  status: "published",
  variants: [],
  attributes: {},
} as unknown as SkuProduct;

afterEach(() => {
  cleanup();
  catalog.templates = [];
  catalog.skus = [];
  catalog.skuDetail = null;
});

describe("bærbare produktkort", () => {
  it("sender skabeloner og SKU-produkter til deres eksisterende produktsider", async () => {
    catalog.templates = [template];
    catalog.skus = [sku];
    render(await BrandPage({ params: Promise.resolve({ brand: "budget" }) }));

    expect(
      screen.getByRole("link", { name: /Lenovo ThinkPad T14 G1/ }),
    ).toHaveAttribute("href", "/refurbished/lenovo-thinkpad-t14-g1");
    expect(
      screen.getByRole("link", { name: /USB-C laptop dock/ }),
    ).toHaveAttribute("href", "/baerbare/usb-c-laptop-dock");
  });

  it("sender relaterede skabeloner fra en SKU-side til refurbished-ruten", async () => {
    catalog.templates = [template];
    catalog.skuDetail = sku;
    render(
      await BrandPage({
        params: Promise.resolve({ brand: "usb-c-laptop-dock" }),
      }),
    );

    expect(
      screen.getByRole("link", { name: /Lenovo ThinkPad T14 G1/ }),
    ).toHaveAttribute("href", "/refurbished/lenovo-thinkpad-t14-g1");
  });
});
