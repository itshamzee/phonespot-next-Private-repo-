import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LagersalgTerms } from "../lagersalg-terms";

describe("LagersalgTerms", () => {
  it("nævner 14 dages fortrydelsesret og 3 for 2", () => {
    render(<LagersalgTerms />);
    expect(screen.getByText(/14 dages fortrydelsesret/)).toBeInTheDocument();
    expect(screen.getByText(/3 for 2/)).toBeInTheDocument();
    expect(screen.queryByText(/ingen returret/i)).toBeNull();
  });
});
