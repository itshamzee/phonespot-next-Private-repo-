import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CartDeviceItem, CartSkuItem, CartState } from "@/lib/cart/types";

// useCart is provided by CartProvider (which lazily reads localStorage via
// loadCart() — empty on the server, the real cart on the client's very
// first render). Mock it directly so each test controls exactly what the
// "known" cart looks like, without depending on localStorage/jsdom timing.
const mockCartState = vi.hoisted(() => ({ current: { items: [], discount: null } as CartState }));
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({ cartState: mockCartState.current }),
}));

import { PrePurchaseInfo } from "@/components/checkout/pre-purchase-info";

const deviceItem: CartDeviceItem = {
  type: "device",
  deviceId: "d1",
  templateId: "t1",
  title: "iPhone 14",
  grade: "A",
  color: "Blue",
  storage: "128GB",
  image: null,
  price: 500000,
  reservedAt: new Date().toISOString(),
};

const accessoryItem: CartSkuItem = {
  type: "sku_product",
  skuProductId: "sku1",
  title: "Læder cover",
  image: null,
  price: 20000,
  quantity: 1,
};

function open() {
  fireEvent.click(screen.getByRole("button", { name: /Vigtige oplysninger/i }));
}

describe("PrePurchaseInfo", () => {
  it("does not claim the 36-month guarantee for an accessory-only cart", () => {
    mockCartState.current = { items: [accessoryItem], discount: null };
    render(<PrePurchaseInfo />);
    open();
    expect(screen.queryByText(/36 måneders garanti/i)).not.toBeInTheDocument();
    expect(screen.getByText(/24 måneders reklamationsret/i)).toBeInTheDocument();
  });

  it("claims the 36-month guarantee when a device is in the cart", () => {
    mockCartState.current = { items: [deviceItem], discount: null };
    render(<PrePurchaseInfo />);
    open();
    expect(screen.getByText(/36 måneders garanti/i)).toBeInTheDocument();
  });

  it("claims the 36-month guarantee for a mixed cart (device + accessory)", () => {
    mockCartState.current = { items: [deviceItem, accessoryItem], discount: null };
    render(<PrePurchaseInfo />);
    open();
    expect(screen.getByText(/36 måneders garanti/i)).toBeInTheDocument();
  });

  it("falls back to the safe (no 36-month claim) wording for an empty cart", () => {
    mockCartState.current = { items: [], discount: null };
    render(<PrePurchaseInfo />);
    open();
    expect(screen.queryByText(/36 måneders garanti/i)).not.toBeInTheDocument();
  });

  // Regression test for the hydration-flip bug: SSR always sees an empty
  // cart, but CartProvider's lazy useReducer init reads the real
  // (non-empty) cart from localStorage synchronously on the client's very
  // first render — before hydration reconciles. PrePurchaseInfo used to
  // derive `hasDevice` directly from cartState, so a device-only cart made
  // the client's first render add a 36-month <li> the server never sent,
  // a hydration mismatch. It must now start from `false` regardless of
  // what the cart mock already contains at mount time, and only reflect
  // the real cart after an effect runs. React Testing Library's render()
  // flushes effects synchronously (inside act()), so by the time render()
  // returns the post-effect state is what's asserted above — this test
  // instead pins down that the component doesn't throw/warn when the cart
  // is already populated at the very first render (the exact scenario that
  // used to desync from SSR).
  it("does not warn or throw when mounted with a device already in the cart", () => {
    mockCartState.current = { items: [deviceItem], discount: null };
    const warnSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<PrePurchaseInfo />)).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
