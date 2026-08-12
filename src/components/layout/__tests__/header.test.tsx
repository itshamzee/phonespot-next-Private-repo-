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

  it("renders the always-visible mobile/tablet category strip", () => {
    render(<Header />);
    const strip = screen.getByRole("navigation", { name: "Kategorier" });
    expect(strip).toBeDefined();
    const links = strip.querySelectorAll("a");
    expect(links.length).toBeGreaterThanOrEqual(7);
  });

  it("does not show mega menu sections by default", () => {
    render(<Header />);
    expect(screen.queryByText("Populære mærker")).toBeNull();
    expect(screen.queryByText("Hjælp mig med")).toBeNull();
  });

  it("shows mega menu when Produkter is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /Produkter/i }));
    expect(screen.getByText("Populære mærker")).toBeDefined();
    expect(screen.getByText("Hjælp mig med")).toBeDefined();
    expect(screen.getByText("Find butik")).toBeDefined();
  });

  it("does not advertise B2B as a header pill", () => {
    render(<Header />);
    expect(screen.queryByText("B2B Portal")).toBeNull();
  });

  it("does not show Foxway anywhere in the header", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /Produkter/i }));
    expect(screen.queryByText(/Foxway/i)).toBeNull();
  });

  it("shows the actual Trustpilot rating of 4.8", () => {
    render(<Header />);
    expect(screen.getByText("★ 4.8")).toBeDefined();
  });

  // The header renders on every page, including accessory PDPs, with no
  // per-page state — accessories carry the statutory 2-year
  // reklamationsret, not PhoneSpot's 36-month device guarantee (see
  // lib/email/brand.ts). An unconditional "36 mdr. garanti" badge on every
  // page (including an accessory PDP) is a misleading overall impression
  // under markedsføringsloven, so both badges must be scoped to
  // "refurbished" instead of a blanket claim.
  it("scopes the top-bar guarantee badge to refurbished devices, not a blanket claim", () => {
    render(<Header />);
    expect(screen.getByText("36 mdr. garanti på refurbished")).toBeDefined();
    expect(screen.queryByText("36 mdr. garanti på")).toBeNull();
  });

  it("scopes the mega-menu USP-bar guarantee badge to refurbished devices, not a blanket claim", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /Produkter/i }));
    expect(screen.getAllByText("36 mdr. garanti på refurbished").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("36 mdr. garanti på")).toBeNull();
  });

  // Same unconditional-chrome problem, same fix: the 30+ point test only
  // runs on graded refurbished devices, never on a sku_product like a
  // leather case — see lib/email/brand.ts's qualityTestUspLabel for the
  // order-aware version of this same fix.
  it("scopes the mega-menu quality-test badge to refurbished devices, not a blanket claim", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /Produkter/i }));
    expect(screen.getAllByText("30+ kvalitetstests på refurbished").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("30+ kvalitetstests")).toBeNull();
  });

  it("shows mobile drawer with categories when hamburger is clicked", () => {
    render(<Header />);
    const hamburger = screen.getByLabelText("Åbn menu");
    fireEvent.click(hamburger);
    expect(screen.getByText("Min konto")).toBeDefined();
    expect(screen.getByText("Mærker")).toBeDefined();
  });

  it("renders the account link to /konto", () => {
    render(<Header />);
    const accountLink = screen.getByLabelText("Min konto");
    expect(accountLink.getAttribute("href")).toBe("/konto");
  });
});
