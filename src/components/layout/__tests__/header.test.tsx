import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({ totals: { itemCount: 0, subtotal: 0, discountAmount: 0, shippingCost: 0, total: 0 }, openCart: vi.fn() }),
}));

import { Header } from "../header";

describe("Header", () => {
  it("renders the logo link", () => {
    render(<Header />);
    const logo = screen.getByAltText("PhoneSpot");
    expect(logo).toBeDefined();
  });

  it("renders top-level desktop nav items", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: /Produkter/i })).toBeDefined();
    expect(screen.getAllByText("Reparation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sælg din enhed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Tilbehør").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Butikker").length).toBeGreaterThanOrEqual(1);
  });

  it("does not show mega menu items by default", () => {
    render(<Header />);
    expect(screen.queryByText("Trending nu")).toBeNull();
    expect(screen.queryByText("Populære mærker")).toBeNull();
  });

  it("shows mega menu when Produkter is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /Produkter/i }));
    expect(screen.getByText("Kategorier")).toBeDefined();
    expect(screen.getByText("Populære mærker")).toBeDefined();
    expect(screen.getByText("Trending nu")).toBeDefined();
    expect(screen.getByText("Spar på Foxway-laptops")).toBeDefined();
  });

  it("shows mobile drawer with categories when hamburger is clicked", () => {
    render(<Header />);
    const hamburger = screen.getByLabelText("Åbn menu");
    fireEvent.click(hamburger);
    expect(screen.getByText("Kategorier")).toBeDefined();
    expect(screen.getByText("Mærker")).toBeDefined();
    expect(screen.getByText("Min konto")).toBeDefined();
  });

  it("renders the account link to /konto", () => {
    render(<Header />);
    const accountLink = screen.getByLabelText("Min konto");
    expect(accountLink.getAttribute("href")).toBe("/konto");
  });
});
