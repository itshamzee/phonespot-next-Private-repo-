import { describe, it, expect } from "vitest";
import { roundOfferDown, OFFER_ROUNDING_ORE } from "../rounding";

describe("roundOfferDown", () => {
  it("rounds to whole 50 kr steps", () => {
    expect(OFFER_ROUNDING_ORE).toBe(5000);
  });

  it("rounds 1470 kr down to 1450 kr", () => {
    expect(roundOfferDown(147000)).toBe(145000);
  });

  it("leaves an exact multiple untouched", () => {
    expect(roundOfferDown(145000)).toBe(145000);
  });

  it("rounds an amount below one step down to zero", () => {
    expect(roundOfferDown(4900)).toBe(0);
  });

  it("never returns a negative amount", () => {
    expect(roundOfferDown(-1)).toBe(0);
  });
});
