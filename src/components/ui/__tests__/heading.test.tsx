import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Heading } from "../heading";

describe("Heading", () => {
  it("renders h1 by default", () => {
    render(<Heading>Title</Heading>);
    const el = screen.getByText("Title");
    expect(el.tagName).toBe("H1");
  });

  it("renders specified level", () => {
    render(<Heading as="h2">Subtitle</Heading>);
    const el = screen.getByText("Subtitle");
    expect(el.tagName).toBe("H2");
  });

  it("applies size classes", () => {
    render(<Heading size="lg">Big</Heading>);
    const el = screen.getByText("Big");
    expect(el.className).toContain("text-3xl");
  });
});
