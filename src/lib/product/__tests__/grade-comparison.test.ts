import { describe, it, expect } from "vitest";
import { pickBetterInStockGrade } from "@/lib/product/grade-comparison";

describe("pickBetterInStockGrade", () => {
  it("returns null when the better grade is sold out (B selected, A sold out, B/C in stock)", () => {
    const grades = [
      { grade: "A", price: 500000, available: 0 },
      { grade: "B", price: 450000, available: 2 },
      { grade: "C", price: 400000, available: 1 },
    ];
    expect(pickBetterInStockGrade(grades, "B")).toBeNull();
  });

  it("compares against the better grade when it is in stock (B selected, A in stock)", () => {
    const grades = [
      { grade: "A", price: 500000, available: 2 },
      { grade: "B", price: 450000, available: 1 },
      { grade: "C", price: 400000, available: 1 },
    ];
    expect(pickBetterInStockGrade(grades, "B")).toEqual(grades[0]);
  });

  it("returns null when the selected grade is already the best one", () => {
    const grades = [
      { grade: "A", price: 500000, available: 2 },
      { grade: "B", price: 450000, available: 1 },
    ];
    expect(pickBetterInStockGrade(grades, "A")).toBeNull();
  });

  it("skips past a sold-out grade to the next better one that has stock", () => {
    const grades = [
      { grade: "N", price: 1240000, available: 1 },
      { grade: "P", price: 900000, available: 0 },
      { grade: "A", price: 800000, available: 0 },
      { grade: "B", price: 700000, available: 3 },
      { grade: "C", price: 600000, available: 1 },
    ];
    expect(pickBetterInStockGrade(grades, "B")).toEqual(grades[0]);
  });

  it("returns null when the grade isn't found in the list", () => {
    const grades = [{ grade: "A", price: 500000, available: 2 }];
    expect(pickBetterInStockGrade(grades, "Z")).toBeNull();
  });
});
