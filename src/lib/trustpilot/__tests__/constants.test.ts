import { describe, it, expect } from "vitest";
import {
  TRUSTPILOT_FALLBACK_SCORE,
  TRUSTPILOT_SCORE_LABEL,
  TRUSTPILOT_SCORE_LABEL_DA,
} from "@/lib/trustpilot/constants";

describe("trustpilot constants", () => {
  it("fallback score matches the verified live rating", () => {
    expect(TRUSTPILOT_FALLBACK_SCORE).toBe(4.8);
  });
  it("labels are derived from the score, not free-typed", () => {
    expect(TRUSTPILOT_SCORE_LABEL).toBe(TRUSTPILOT_FALLBACK_SCORE.toFixed(1));
    expect(TRUSTPILOT_SCORE_LABEL_DA).toBe(TRUSTPILOT_FALLBACK_SCORE.toFixed(1).replace(".", ","));
  });
});
