import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AccessoryDetail } from "../accessory-detail";
import type { SkuProduct } from "@/lib/supabase/platform-types";

// AccessoryDetail renders AddToCartButton/CrossSellCard, which call
// useCart() — stub it so the component tree doesn't need a real
// CartProvider for these render-only assertions.
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({ addSku: vi.fn(), openCart: vi.fn() }),
}));

// jsdom has no IntersectionObserver — StickyMobileCta observes the CTA
// block to toggle the mobile sticky bar. Stub it so rendering doesn't throw.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver = MockIntersectionObserver;

function makeProduct(overrides: Partial<SkuProduct> = {}): SkuProduct {
  return {
    id: "1",
    title: 'Apple Smart Folio iPad Air 11" Denim',
    description:
      'Apple Smart Folio i Denim beskytter forsiden af din iPad Air 11" og folder om, så den kan bruges som stander.',
    ean: null,
    product_number: null,
    cost_price: null,
    selling_price: 39900,
    sale_price: null,
    brand: "Apple",
    category: "accessory",
    subcategory: "cover",
    supplier_id: null,
    images: [],
    is_active: true,
    short_description: null,
    meta_title: null,
    meta_description: null,
    slug: "apple-smart-folio-ipad-air-11-denim",
    variants: [],
    barcode: null,
    status: "published",
    always_in_stock: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AccessoryDetail", () => {
  // Regression test for the same leather-iPad-case bug class fixed in
  // ProductDetails variant="accessory": a SKU product whose title contains
  // "iPad Air 11" must never render device-only claims. AccessoryDetail's
  // trust strip used to hardcode "36 måneders garanti" regardless of the
  // fact that sku_products are accessories, not graded refurbished devices.
  const product = makeProduct();

  it('never claims the 36-month device warranty ("36 måneder")', () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/36 måneder/i)).not.toBeInTheDocument();
  });

  it("never mentions a cosmetic grade", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/grade/i)).not.toBeInTheDocument();
  });

  it("never mentions battery", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/batteri/i)).not.toBeInTheDocument();
  });

  it("never claims a quality test count", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/kvalitetstest/i)).not.toBeInTheDocument();
  });

  it("shows the statutory 2-year reklamationsret instead", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.getByText(/2 års reklamationsret/i)).toBeInTheDocument();
  });
});
