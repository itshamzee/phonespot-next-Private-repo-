import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConditionExplainer } from "../condition-explainer";

describe("ConditionExplainer", () => {
  it("renders all three grades", () => {
    render(<ConditionExplainer />);
    expect(screen.getAllByText("Som ny").length).toBeGreaterThan(0);
    expect(screen.getAllByText("God stand").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brugt stand").length).toBeGreaterThan(0);
  });

  it("renders compact variant", () => {
    const { container } = render(<ConditionExplainer variant="compact" />);
    expect(container.querySelector("[data-variant='compact']")).toBeInTheDocument();
  });
});
