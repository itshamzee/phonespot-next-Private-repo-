import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConditionPicker } from "../condition-picker";

const mockGrades = [
  { grade: "A" as const, label: "Som ny", price: "2499", available: true },
  { grade: "B" as const, label: "Meget god", price: "2199", available: true },
  { grade: "C" as const, label: "OK stand", price: "1899", available: false },
];

describe("ConditionPicker", () => {
  it("renders all grade options", () => {
    render(<ConditionPicker grades={mockGrades} selected="A" onSelect={() => {}} />);
    expect(screen.getByText("Som ny")).toBeInTheDocument();
    expect(screen.getByText("Meget god")).toBeInTheDocument();
    expect(screen.getByText("OK stand")).toBeInTheDocument();
  });

  it("marks unavailable grades", () => {
    render(<ConditionPicker grades={mockGrades} selected="A" onSelect={() => {}} />);
    expect(screen.getByText("Udsolgt")).toBeInTheDocument();
  });
});
