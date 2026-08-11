import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrustBar, baseTrustItems } from "../trust-bar";

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

  // Regression guard: which item becomes "2 års reklamationsret" under
  // variant="accessory" must be driven by an explicit, typed field
  // (isGuaranteeClaim), never by comparing item.label against the literal
  // string "36 mdr. garanti". Reword the guarantee item's label (simulating
  // a future copy edit) and prove the swap still fires — under the old
  // `item.label === "36 mdr. garanti"` implementation this would fail,
  // because after the rename that comparison would no longer match and the
  // accessory variant would silently render the reworded (over-claiming)
  // copy instead of "2 års reklamationsret".
  it("keeps swapping to reklamationsret even if the guarantee item's label text changes", () => {
    const guaranteeItem = baseTrustItems.find((item) => item.isGuaranteeClaim);
    expect(guaranteeItem).toBeDefined();
    const originalLabel = guaranteeItem!.label;
    guaranteeItem!.label = "Totally reworded copy";
    try {
      render(<TrustBar variant="accessory" />);
      expect(screen.queryByText("Totally reworded copy")).not.toBeInTheDocument();
      expect(screen.getByText("2 års reklamationsret")).toBeInTheDocument();
    } finally {
      guaranteeItem!.label = originalLabel;
    }
  });

  it("exactly one item is marked as the guarantee claim", () => {
    const guaranteeItems = baseTrustItems.filter((item) => item.isGuaranteeClaim);
    expect(guaranteeItems).toHaveLength(1);
  });
});
