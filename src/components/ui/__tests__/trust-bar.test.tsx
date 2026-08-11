import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrustBar } from "../trust-bar";

describe("TrustBar", () => {
  it("renders all trust items", () => {
    render(<TrustBar />);
    expect(screen.getByText("e-mærket")).toBeInTheDocument();
    expect(screen.getByText("36 mdr. garanti")).toBeInTheDocument();
    expect(screen.getByText("14 dages returret")).toBeInTheDocument();
    expect(screen.getByText("Hurtig levering")).toBeInTheDocument();
  });

  // The 36-month claim is the refurbished-device warranty — accessories
  // (sku_products) are not covered by it, only by the statutory 2-year
  // reklamationsret. variant="accessory" must never render "36 mdr. garanti".
  it('variant="accessory" swaps the 36-month device warranty for the statutory reklamationsret', () => {
    render(<TrustBar variant="accessory" />);
    expect(screen.queryByText("36 mdr. garanti")).not.toBeInTheDocument();
    expect(screen.getByText("2 års reklamationsret")).toBeInTheDocument();
    expect(screen.getByText("e-mærket")).toBeInTheDocument();
    expect(screen.getByText("14 dages returret")).toBeInTheDocument();
  });
});
