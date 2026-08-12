import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { CartDeviceItem, CartSkuItem, CartState } from "@/lib/cart/types";

// useCart is provided by CartProvider, which lazily reads localStorage via
// loadCart() in its useReducer initializer — empty on the server (no
// `window`), the real (possibly non-empty) cart synchronously on the
// client's very first render, before any effect runs and before hydration
// reconciles. Mock it directly so each test controls exactly what the
// "known" cart looks like at that first-render instant, without depending
// on localStorage/jsdom timing.
const mockCartState = vi.hoisted(() => ({ current: { items: [], discount: null } as CartState }));
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({ cartState: mockCartState.current }),
}));

// KassePage pulls in CheckoutForm (useRouter, ShippingSelector, Stripe-ish
// checkout wiring) and CheckoutSummary — neither is relevant to the
// guarantee-wording bug this file pins, and both drag in dependencies
// (next/navigation's router, cart totals) that would just be noise here.
// Stub them out so this file only exercises the page shell + USP tile.
vi.mock("@/components/checkout/checkout-form", () => ({
  CheckoutForm: () => <div data-testid="checkout-form-stub" />,
}));
vi.mock("@/components/checkout/checkout-summary", () => ({
  CheckoutSummary: () => <div data-testid="checkout-summary-stub" />,
}));

import KassePage from "@/app/kasse/page";

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

afterEach(() => {
  cleanup();
});

describe("KassePage — guarantee USP tile", () => {
  it("shows the 36-month claim once mounted with a device in the cart", () => {
    mockCartState.current = { items: [deviceItem], discount: null };
    render(<KassePage />);
    expect(screen.getByText("36 måneders garanti")).toBeInTheDocument();
  });

  it("shows the statutory reklamationsret for an accessory-only cart", () => {
    mockCartState.current = { items: [accessoryItem], discount: null };
    render(<KassePage />);
    expect(screen.getByText("2 års reklamationsret")).toBeInTheDocument();
    expect(screen.queryByText("36 måneders garanti")).not.toBeInTheDocument();
  });

  it("shows the statutory reklamationsret for an empty cart", () => {
    mockCartState.current = { items: [], discount: null };
    render(<KassePage />);
    expect(screen.getByText("2 års reklamationsret")).toBeInTheDocument();
  });
});

// Regression coverage for the actual hydration-mismatch bug: unlike
// PrePurchaseInfo's <li> (gated behind a closed accordion, so the
// differing markup never reaches the DOM on first paint either way), this
// USP tile renders unconditionally — so deriving `hasDevice` straight from
// `cartState.items` really does produce different first-paint output
// between server and client for a device cart, which is a genuine React
// hydration mismatch, not just a theoretical one.
//
// `renderToString` never runs effects (Suspense/SSR semantics — passive
// effects only ever run on a real client commit), so under the fixed
// `useState(false)` + `useEffect` pattern its output is guaranteed
// cart-independent: this is the single fact that makes SSR output equal
// the client's pre-effect first paint. Under the previous, unfixed
// `cartState.items.some(...)` computation, `renderToString` would instead
// reflect the mocked cart directly (there is no effect gate to prevent
// it), which is exactly the class of bug this test would catch.
describe("KassePage — deterministic first render (SSR vs. client's pre-effect paint)", () => {
  it("SSR output never contains the 36-month claim, even with a device already in the (client-only) cart mock", () => {
    mockCartState.current = { items: [deviceItem], discount: null };
    const html = renderToString(<KassePage />);
    expect(html).not.toContain("36 måneders garanti");
    expect(html).toContain("2 års reklamationsret");
  });

  it("the client's very first synchronous commit matches the SSR string exactly, before the cart-sync effect has run", async () => {
    mockCartState.current = { items: [deviceItem], discount: null };
    const ssrHtml = renderToString(<KassePage />);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    // Deliberately NOT wrapped in `act()` / React Testing Library's
    // `render()` — both flush passive effects synchronously before
    // returning, which would hide exactly the pre-effect instant this test
    // needs to observe. `flushSync` forces the initial commit to happen
    // synchronously (a bare `root.render()` defers even the commit to a
    // microtask under React's default scheduling) without also running the
    // `useEffect` callback — passive effects are always deferred past
    // paint by design, so reading the DOM immediately afterwards captures
    // the true pre-effect first paint.
    flushSync(() => root.render(<KassePage />));

    expect(container.textContent).not.toContain("36 måneders garanti");
    expect(container.textContent).toContain("2 års reklamationsret");
    // Cross-check against the actual SSR string, not just the copy
    // literal, so this also catches a future refactor that changes the
    // surrounding markup/structure in a way that would break hydration.
    expect(ssrHtml).toContain("2 års reklamationsret");

    // Now let the effect flush and confirm the tile settles on the
    // accurate, cart-aware wording — the mismatch window closes safely
    // after mount rather than being permanently stuck on the safe copy.
    await act(async () => {});
    expect(container.textContent).toContain("36 måneders garanti");

    root.unmount();
    container.remove();
  });
});
