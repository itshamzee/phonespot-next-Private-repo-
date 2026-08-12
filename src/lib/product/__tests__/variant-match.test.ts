import { describe, it, expect } from "vitest";
import { matchesStorage, matchesColor, resolveCartStorage, resolveCartColor } from "../variant-match";

describe("matchesStorage", () => {
  it("a null-storage unit does NOT match a specific capacity selection (template has variants)", () => {
    // Regression: a device with no storage recorded must never be matched
    // as though it were the specific capacity the customer picked — that's
    // how a 128GB phone gets sold and invoiced as 1TB.
    expect(matchesStorage(null, "128GB")).toBe(false);
    expect(matchesStorage(undefined, "1TB")).toBe(false);
  });

  it("a null-storage unit DOES match when the template has no storage_options at all", () => {
    // selectedStorage is only "" when template.storage_options is empty —
    // there is no capacity concept for this model, so nothing is being
    // silently satisfied.
    expect(matchesStorage(null, "")).toBe(true);
    expect(matchesStorage(undefined, "")).toBe(true);
  });

  it("a unit with real storage matches only its own exact value", () => {
    expect(matchesStorage("128GB", "128GB")).toBe(true);
    expect(matchesStorage("128GB", "256GB")).toBe(false);
  });

  it("a unit with real storage still matches when no selection is asserted", () => {
    expect(matchesStorage("128GB", "")).toBe(true);
  });
});

describe("matchesColor", () => {
  it("a null-color unit does NOT match a specific colour selection (template has variants)", () => {
    expect(matchesColor(null, "Sort")).toBe(false);
    expect(matchesColor(undefined, "Sølv")).toBe(false);
  });

  it("a null-color unit DOES match when the template has no colors at all", () => {
    expect(matchesColor(null, "")).toBe(true);
    expect(matchesColor(undefined, "")).toBe(true);
  });

  it("a unit with a real color matches only its own exact value", () => {
    expect(matchesColor("Sort", "Sort")).toBe(true);
    expect(matchesColor("Sort", "Sølv")).toBe(false);
  });
});

describe("resolveCartStorage / resolveCartColor", () => {
  it("records the unit's own storage, not the customer's selection, when both are known and differ", () => {
    // Defence in depth: even if a caller passed mismatched values, the
    // unit's own value always wins. In practice matchesStorage already
    // guarantees unit.storage === selectedStorage whenever the unit is a
    // candidate for a specific-capacity cart line.
    expect(resolveCartStorage("128GB", "256GB")).toBe("128GB");
    expect(resolveCartColor("Sort", "Sølv")).toBe("Sort");
  });

  it("falls back to the selection only when the unit's own value is unknown (no-variant template)", () => {
    expect(resolveCartStorage(null, "")).toBe("");
    expect(resolveCartColor(undefined, "")).toBe("");
  });
});
