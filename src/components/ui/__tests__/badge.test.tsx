import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../badge";
import { ConditionBadge } from "../condition-badge";

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Test Label</Badge>);
    const badge = screen.getByText("Test Label");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-charcoal");
  });

  it("renders with eco variant", () => {
    render(<Badge variant="eco">Eco Label</Badge>);
    const badge = screen.getByText("Eco Label");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-eco/10");
    expect(badge.className).toContain("text-green-eco");
  });

  it("renders with outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText("Outline");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("border-sand");
  });

  it("applies custom className", () => {
    render(<Badge className="mt-4">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge.className).toContain("mt-4");
  });
});

describe("ConditionBadge", () => {
  it("renders grade A as 'Som ny'", () => {
    render(<ConditionBadge grade="A" />);
    const badge = screen.getByText("Som ny");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-eco");
  });

  it("renders grade B as 'Meget god'", () => {
    render(<ConditionBadge grade="B" />);
    const badge = screen.getByText("Meget god");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-light");
  });

  it("renders grade C as 'OK stand'", () => {
    render(<ConditionBadge grade="C" />);
    const badge = screen.getByText("OK stand");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-gray");
  });
});
