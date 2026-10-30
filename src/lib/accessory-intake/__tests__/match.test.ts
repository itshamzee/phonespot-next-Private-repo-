import { describe, it, expect } from "vitest";
import { subcategoryFor } from "../match";

describe("subcategoryFor", () => {
  it("tasker får subcategory bag, iPad-covers bliver covers", () => {
    expect(subcategoryFor("bag")).toBe("bag");
    expect(subcategoryFor("ipad_cover")).toBe("cover");
  });
});
