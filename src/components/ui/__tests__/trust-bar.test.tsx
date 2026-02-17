import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrustBar } from "../trust-bar";

describe("TrustBar", () => {
  it("renders all trust items", () => {
    render(<TrustBar />);
    expect(screen.getByText("e-mærket")).toBeInTheDocument();
    expect(screen.getByText("24 mdr. garanti")).toBeInTheDocument();
    expect(screen.getByText("14 dages returret")).toBeInTheDocument();
    expect(screen.getByText("Hurtig levering")).toBeInTheDocument();
  });
});
