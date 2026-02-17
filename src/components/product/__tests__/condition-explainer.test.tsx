import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConditionExplainer } from "../condition-explainer";

describe("ConditionExplainer", () => {
  it("renders all three grades", () => {
    render(<ConditionExplainer />);
    expect(screen.getByText("Som ny")).toBeInTheDocument();
    expect(screen.getByText("Meget god")).toBeInTheDocument();
    expect(screen.getByText("OK stand")).toBeInTheDocument();
  });

  it("renders compact variant", () => {
    const { container } = render(<ConditionExplainer variant="compact" />);
    expect(container.querySelector("[data-variant='compact']")).toBeInTheDocument();
  });
});
