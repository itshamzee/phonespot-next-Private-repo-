import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProductGridCard } from "../product-grid-card";

// Regression coverage: the grid card ("Nypris: …") must only ever render a
// struck-through comparison price when the caller passes a real
// compareAtPrice (sourced from new_price) that's actually higher than the
// current price. It must render nothing when that's not the case — callers
// (featured-products.tsx, homepage-products API route) must never pass
// base_price_a (PhoneSpot's own Grade A price) here.
describe("ProductGridCard — compare-at price", () => {
  const base = {
    slug: "hp-elitebook-8-g1i",
    title: "HP EliteBook 8 G1i",
    deviceCount: 2,
    brand: "HP",
    category: "laptop",
  };

  it("shows the Nypris comparison when compareAtPrice is set and higher than minPrice", () => {
    render(<ProductGridCard {...base} minPrice={999900} compareAtPrice={1584600} />);
    expect(screen.getByText(/Nypris/)).toBeInTheDocument();
    expect(screen.getByText(/15\.846/)).toBeInTheDocument();
  });

  it("renders no Nypris line when compareAtPrice is null", () => {
    render(<ProductGridCard {...base} minPrice={999900} compareAtPrice={null} />);
    expect(screen.queryByText(/Nypris/)).not.toBeInTheDocument();
  });

  it("renders no Nypris line when compareAtPrice is undefined (not passed)", () => {
    render(<ProductGridCard {...base} minPrice={999900} />);
    expect(screen.queryByText(/Nypris/)).not.toBeInTheDocument();
  });

  it("renders no Nypris line when compareAtPrice is not actually higher than minPrice", () => {
    render(<ProductGridCard {...base} minPrice={999900} compareAtPrice={999900} />);
    expect(screen.queryByText(/Nypris/)).not.toBeInTheDocument();
  });
});
