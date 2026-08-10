import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GradeSelector } from "@/components/product/grade-selector";

describe("GradeSelector", () => {
  it("renders only the grades that are actually in stock", () => {
    render(
      <GradeSelector
        grades={[{ grade: "N", price: 1240000, available: 1 }]}
        selected="N"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/Fabriksny/i)).toBeInTheDocument();
    expect(screen.queryByText("God")).not.toBeInTheDocument();
    expect(screen.queryByText("Brugt")).not.toBeInTheDocument();
  });

  it("filters out zero-stock grades even when the caller still includes them in the list", () => {
    render(
      <GradeSelector
        grades={[
          { grade: "A", price: 500000, available: 0 },
          { grade: "B", price: 450000, available: 3 },
        ]}
        selected="B"
        onChange={() => {}}
      />,
    );
    // A ("Perfekt") is sold out and must not be advertised.
    expect(screen.queryByText("Perfekt")).not.toBeInTheDocument();
    expect(screen.queryByText(/Udsolgt/i)).not.toBeInTheDocument();
    expect(screen.getByText("God")).toBeInTheDocument();
  });

  it("renders a single available grade as a statement, not a choice", () => {
    const { container } = render(
      <GradeSelector
        grades={[{ grade: "N", price: 1240000, available: 1 }]}
        selected="N"
        onChange={() => {}}
      />,
    );
    expect(
      container.querySelectorAll('button, input[type="radio"], [role="radio"]'),
    ).toHaveLength(0);
    // Links to the grade explanation instead of offering a choice.
    expect(container.querySelector('a[href="#hvad-betyder-standen"]')).toBeInTheDocument();
  });

  it("still renders selectable options when several grades are in stock", () => {
    const { container } = render(
      <GradeSelector
        grades={[
          { grade: "A", price: 500000, available: 2 },
          { grade: "B", price: 450000, available: 1 },
        ]}
        selected="A"
        onChange={() => {}}
      />,
    );
    expect(
      container.querySelectorAll('button, [role="radio"]').length,
    ).toBeGreaterThan(0);
  });

  it("renders nothing when no grade has stock", () => {
    const { container } = render(
      <GradeSelector
        grades={[
          { grade: "A", price: 500000, available: 0 },
          { grade: "B", price: 450000, available: 0 },
        ]}
        selected="A"
        onChange={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
