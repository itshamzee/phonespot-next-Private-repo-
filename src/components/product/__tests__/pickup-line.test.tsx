import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PickupLine } from "@/components/product/pickup-line";

describe("PickupLine", () => {
  it("names the store and its street when the unit is in a shop", () => {
    render(<PickupLine stockByStore={[{ slug: "vejle", count: 1 }]} />);
    expect(screen.getByText(/Vejle/)).toBeInTheDocument();
    expect(screen.getByText(/Løversysselvej 3B/)).toBeInTheDocument();
  });

  it("mentions both stores when stock is in both", () => {
    render(<PickupLine stockByStore={[{ slug: "vejle", count: 1 }, { slug: "slagelse", count: 2 }]} />);
    expect(screen.getByText(/Vejle/)).toBeInTheDocument();
    expect(screen.getByText(/Slagelse/)).toBeInTheDocument();
  });

  it("falls back to delivery copy and never claims pickup when no shop holds stock", () => {
    render(<PickupLine stockByStore={[]} />);
    expect(screen.queryByText(/hentes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/levering/i)).toBeInTheDocument();
  });
});
