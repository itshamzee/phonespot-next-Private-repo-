import { describe, it, expect } from "vitest";
import { normalizeModel } from "../model-normalize";

describe("normalizeModel", () => {
  it("passes through a standard Apple model", () => {
    expect(normalizeModel("Apple", "iPhone 12")).toEqual({
      templateModel: "iPhone 12",
      isApple: true,
      knownModel: true,
    });
  });

  it("trims whitespace and keeps the bare model", () => {
    const r = normalizeModel("Apple", "  iPhone 13 Pro  ");
    expect(r.templateModel).toBe("iPhone 13 Pro");
    expect(r.knownModel).toBe(true);
  });

  it("remaps a known wizard/template mismatch", () => {
    expect(normalizeModel("Apple", "iPhone SE (3. gen)").templateModel).toBe("iPhone SE (2022)");
  });

  it("marks non-Apple brands as not Apple", () => {
    const r = normalizeModel("Samsung", "Galaxy S24 Ultra");
    expect(r.isApple).toBe(false);
  });

  it("marks empty/custom model as unknown", () => {
    expect(normalizeModel("Apple", "").knownModel).toBe(false);
  });
});
