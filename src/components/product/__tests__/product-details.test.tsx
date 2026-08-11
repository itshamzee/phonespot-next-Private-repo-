import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProductDetails } from "../product-details";
import type { Product } from "@/lib/shopify/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "1",
    handle: "apple-smart-folio-ipad-air-11-denim",
    title: 'Apple Smart Folio iPad Air 11" Denim',
    description:
      "Apple Smart Folio i Denim beskytter forsiden af din iPad Air 11\" og folder om, så den kan bruges som stander.",
    descriptionHtml: "",
    vendor: "Apple",
    productType: "cover",
    tags: ["cover", "apple"],
    availableForSale: true,
    priceRange: {
      minVariantPrice: { amount: "399.00", currencyCode: "DKK" },
      maxVariantPrice: { amount: "399.00", currencyCode: "DKK" },
    },
    images: [],
    variants: [],
    seo: { title: null, description: null },
    ...overrides,
  };
}

describe("ProductDetails — variant=\"accessory\"", () => {
  // Regression test for the leather-iPad-case bug: a SKU product whose
  // title contains "iPad Air 11" must never get the iPad device spec
  // table, grade/battery claims, or the 36-month device warranty.
  const product = makeProduct();

  it('never claims the 36-month device warranty ("36 måneder")', () => {
    render(<ProductDetails product={product} variant="accessory" />);
    expect(screen.queryByText(/36 måneder/i)).not.toBeInTheDocument();
  });

  it("never mentions a cosmetic grade", () => {
    render(<ProductDetails product={product} variant="accessory" />);
    expect(screen.queryByText(/grade/i)).not.toBeInTheDocument();
  });

  it("never mentions battery", () => {
    render(<ProductDetails product={product} variant="accessory" />);
    expect(screen.queryByText(/batteri/i)).not.toBeInTheDocument();
  });

  it("never claims the 30-point quality test", () => {
    render(<ProductDetails product={product} variant="accessory" />);
    expect(screen.queryByText(/kvalitetstest/i)).not.toBeInTheDocument();
  });

  it("mentions the statutory 2-year reklamationsret instead", () => {
    render(<ProductDetails product={product} variant="accessory" />);
    expect(screen.getAllByText(/2 års reklamationsret/i).length).toBeGreaterThan(0);
  });

  it("shows only the accessory's own specs when provided, never invented device specs", () => {
    render(
      <ProductDetails
        product={product}
        variant="accessory"
        accessorySpecs={[
          { label: "Materiale", value: "Polyuretan" },
          { label: "Farve", value: "Denim" },
        ]}
      />,
    );
    expect(screen.getByText("Materiale")).toBeInTheDocument();
    expect(screen.getByText("Polyuretan")).toBeInTheDocument();
    expect(screen.queryByText("Kamera (bag)")).not.toBeInTheDocument();
    expect(screen.queryByText("Garanti")).not.toBeInTheDocument();
  });

  it("renders no spec table at all when there are no accessory specs", () => {
    render(<ProductDetails product={product} variant="accessory" />);
    expect(screen.queryByText("Specifikationer")).not.toBeInTheDocument();
  });
});

describe("ProductDetails — device (default variant), unchanged", () => {
  const device = makeProduct({
    title: "Apple iPhone 15 Pro",
    productType: "iphone",
  });

  it("still renders the full device treatment: grade, battery, warranty, quality test", () => {
    render(<ProductDetails product={device} batteryHealth={92} />);
    expect(screen.getByText(/36 måneders PhoneSpot-garanti/i)).toBeInTheDocument();
    expect(screen.getByText(/92% \(testet og verificeret\)/i)).toBeInTheDocument();
    expect(screen.getByText(/kvalitetstest/i)).toBeInTheDocument();
    expect(screen.getByText("Kamera (bag)")).toBeInTheDocument();
  });
});
