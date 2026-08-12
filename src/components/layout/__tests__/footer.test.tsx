import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "../footer";

// The footer's USP bar renders unconditionally on every page, including
// accessory PDPs, with no per-page state — accessories carry the statutory
// 2-year reklamationsret, not PhoneSpot's 36-month device guarantee (see
// lib/email/brand.ts). An unconditional "36 mdr. garanti" badge here
// contributes to a misleading overall impression on an accessory page under
// markedsføringsloven, so it must be scoped to "refurbished" instead of a
// blanket claim — the same fix applied to both header.tsx USP badges.
describe("Footer", () => {
  it("scopes the USP-bar guarantee badge to refurbished devices, not a blanket claim", () => {
    render(<Footer />);
    expect(screen.getByText("36 mdr. garanti på refurbished")).toBeDefined();
    expect(screen.queryByText("36 mdr. garanti på")).toBeNull();
  });

  it("still states the full, accurate guarantee claim in the brand paragraph", () => {
    render(<Footer />);
    expect(
      screen.getByText(/Alle refurbished enheder leveres med 36 måneders garanti/i),
    ).toBeDefined();
  });

  // Same claim, same problem: the 30+ point test only runs on graded
  // refurbished devices, never on a sku_product like a leather case — see
  // lib/email/brand.ts's qualityTestUspLabel for the order-aware version of
  // this same fix.
  it("scopes the USP-bar quality-test badge to refurbished devices, not a blanket claim", () => {
    render(<Footer />);
    expect(screen.getByText("30+ kvalitetstests på refurbished")).toBeDefined();
    expect(screen.queryByText("30+ kvalitetstests")).toBeNull();
  });
});
