import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToCartButton } from "../add-to-cart-button";

const cart = vi.hoisted(() => ({ addSku: vi.fn(), openCart: vi.fn(), openUpsell: vi.fn() }));
vi.mock("@/components/cart/cart-context", () => ({ useCart: () => cart }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const props = {
  variantId: "v1",
  availableForSale: true,
  skuProductId: "sku-1",
  title: "Cover",
  price: 19900,
};

describe("AddToCartButton confirmation", () => {
  it("shows 'Lagt i kurven' briefly after adding, then returns to the normal label", () => {
    render(<AddToCartButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
    expect(cart.addSku).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Lagt i kurven" })).toBeEnabled();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("button", { name: "Læg i kurv" })).toBeInTheDocument();
  });

  it("does not block a second click while the confirmation shows", () => {
    render(<AddToCartButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagt i kurven" }));
    expect(cart.addSku).toHaveBeenCalledTimes(2);
    expect(cart.openCart).toHaveBeenCalledTimes(2);
  });

  it("never confirms when sold out", () => {
    render(<AddToCartButton {...props} availableForSale={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Udsolgt" }));
    expect(cart.addSku).not.toHaveBeenCalled();
    expect(screen.queryByText("Lagt i kurven")).not.toBeInTheDocument();
  });
});
