import { describe, it, expect } from "vitest";
import { isNewGrade, merchantCondition, gradeFeedLabel, GRADE_SHORT_LABEL } from "../grades";

describe("isNewGrade", () => {
  it("is true only for grade N", () => {
    expect(isNewGrade("N")).toBe(true);
    expect(isNewGrade("P")).toBe(false);
    expect(isNewGrade("A")).toBe(false);
    expect(isNewGrade("B")).toBe(false);
    expect(isNewGrade("C")).toBe(false);
    expect(isNewGrade(null)).toBe(false);
    expect(isNewGrade(undefined)).toBe(false);
  });
});

describe("merchantCondition", () => {
  it("declares grade N as 'new' for Merchant Center / Meta Catalog feeds", () => {
    expect(merchantCondition("N")).toBe("new");
  });

  it("declares P/A/B/C as 'refurbished'", () => {
    expect(merchantCondition("P")).toBe("refurbished");
    expect(merchantCondition("A")).toBe("refurbished");
    expect(merchantCondition("B")).toBe("refurbished");
    expect(merchantCondition("C")).toBe("refurbished");
  });
});

describe("gradeFeedLabel", () => {
  it("labels grade N as 'Fabriksny', never mentioning refurbished", () => {
    const label = gradeFeedLabel("N");
    expect(label).toBe("Fabriksny");
    expect(label.toLowerCase()).not.toContain("refurbished");
  });

  it("labels other grades as 'Grade X Refurbished'", () => {
    expect(gradeFeedLabel("A")).toBe("Grade A Refurbished");
  });
});

describe("GRADE_SHORT_LABEL", () => {
  it("has a non-empty, non-refurbished label for every grade, especially N and P", () => {
    for (const grade of ["N", "P", "A", "B", "C"] as const) {
      const label = GRADE_SHORT_LABEL[grade];
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    }
    expect(GRADE_SHORT_LABEL.N.toLowerCase()).not.toContain("refurbished");
    expect(GRADE_SHORT_LABEL.N).toBe("Fabriksny");
    expect(GRADE_SHORT_LABEL.P).toBe("Premium stand");
  });
});
