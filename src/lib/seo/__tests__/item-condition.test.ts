import { describe, it, expect } from "vitest";
import {
  ITEM_CONDITION,
  gradeToItemCondition,
  devicesToItemCondition,
} from "../item-condition";

describe("gradeToItemCondition", () => {
  it("maps grade N (fabriksny) to NewCondition", () => {
    expect(gradeToItemCondition("N")).toBe(ITEM_CONDITION.NEW);
  });

  it.each(["P", "A", "B", "C"])("maps grade %s to RefurbishedCondition", (grade) => {
    expect(gradeToItemCondition(grade)).toBe(ITEM_CONDITION.REFURBISHED);
  });

  it("maps missing/unknown grade to RefurbishedCondition (conservative default)", () => {
    expect(gradeToItemCondition(null)).toBe(ITEM_CONDITION.REFURBISHED);
    expect(gradeToItemCondition(undefined)).toBe(ITEM_CONDITION.REFURBISHED);
    expect(gradeToItemCondition("")).toBe(ITEM_CONDITION.REFURBISHED);
  });
});

describe("devicesToItemCondition", () => {
  it("returns NewCondition when every listed device is grade N", () => {
    expect(
      devicesToItemCondition([{ grade: "N" }, { grade: "N" }, { grade: "N" }]),
    ).toBe(ITEM_CONDITION.NEW);
  });

  it("returns RefurbishedCondition when every listed device is a used grade", () => {
    expect(
      devicesToItemCondition([{ grade: "A" }, { grade: "B" }, { grade: "C" }]),
    ).toBe(ITEM_CONDITION.REFURBISHED);
  });

  it("falls back to RefurbishedCondition on a mixed N + used batch (one N, one B)", () => {
    expect(devicesToItemCondition([{ grade: "N" }, { grade: "B" }])).toBe(
      ITEM_CONDITION.REFURBISHED,
    );
  });

  it("falls back to RefurbishedCondition on a mixed N + P batch", () => {
    expect(devicesToItemCondition([{ grade: "N" }, { grade: "P" }])).toBe(
      ITEM_CONDITION.REFURBISHED,
    );
  });

  it("returns NewCondition for a single grade-N device (e.g. the MacBook Air 15 M4 case)", () => {
    expect(devicesToItemCondition([{ grade: "N" }])).toBe(ITEM_CONDITION.NEW);
  });

  it("defaults to RefurbishedCondition when there are no listed devices (sold out)", () => {
    expect(devicesToItemCondition([])).toBe(ITEM_CONDITION.REFURBISHED);
  });
});
