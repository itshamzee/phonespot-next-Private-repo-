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

  it("renders dropdown triggers on desktop", () => {
    render(<Header />);
    expect(screen.getByText("Produkter")).toBeDefined();
    expect(screen.getByText("Om PhoneSpot")).toBeDefined();
  });

  it("does not show dropdown items by default", () => {
    render(<Header />);
    expect(screen.queryByText("Fra iPhone SE til 16 Pro Max")).toBeNull();
  });

  it("shows dropdown items when trigger is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByText("Produkter"));
    expect(screen.getByText("iPhones")).toBeDefined();
    expect(screen.getByText("Fra iPhone SE til 16 Pro Max")).toBeDefined();
  });

  it("shows mobile menu when hamburger is clicked", () => {
    render(<Header />);
    const hamburger = screen.getByLabelText("Åbn menu");
    fireEvent.click(hamburger);
    const produkterButtons = screen.getAllByText("Produkter");
    expect(produkterButtons.length).toBeGreaterThanOrEqual(2);
  });
});
