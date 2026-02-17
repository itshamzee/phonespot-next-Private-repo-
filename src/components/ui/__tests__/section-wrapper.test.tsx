import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SectionWrapper } from "../section-wrapper";

describe("SectionWrapper", () => {
  it("renders children with default padding", () => {
    render(<SectionWrapper>Hello</SectionWrapper>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies alternate background when specified", () => {
    const { container } = render(
      <SectionWrapper background="sand">Content</SectionWrapper>
    );
    const section = container.firstChild as HTMLElement;
    expect(section.className).toContain("bg-sand");
  });

  it("applies custom className", () => {
    const { container } = render(
      <SectionWrapper className="my-custom">Content</SectionWrapper>
    );
    const section = container.firstChild as HTMLElement;
    expect(section.className).toContain("my-custom");
  });
});
