import { describe, it, expect } from "vitest";
import { shouldAutoSend } from "../auto-send";
import { DEFAULT_BUYBACK_SETTINGS } from "../settings";
import type { LeadSuggestion } from "../suggest";
import type { BuybackSettings } from "../types";

const on: BuybackSettings = { ...DEFAULT_BUYBACK_SETTINGS, autoSendEnabled: true };

function suggestion(o: Partial<LeadSuggestion> = {}): LeadSuggestion {
  return {
    status: "ok",
    totalAimOre: 180000,
    totalFloorOre: 210000,
    perDevice: [],
    suggestDecline: false,
    ...o,
  };
}

describe("shouldAutoSend", () => {
  it("sends a single priced device inside the cap", () => {
    expect(shouldAutoSend(suggestion(), 1, on).send).toBe(true);
  });

  it("never sends while automation is off", () => {
    const r = shouldAutoSend(suggestion(), 1, DEFAULT_BUYBACK_SETTINGS);
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/slået fra/i);
  });

  it("never sends while paused", () => {
    const r = shouldAutoSend(suggestion(), 1, { ...on, pausedReason: "Foneday-katalog er 4 dage gammelt" });
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/pause/i);
  });

  it("never sends a manual result, and passes its reason through", () => {
    const r = shouldAutoSend(suggestion({ status: "manual", manualReason: "iCloud-låst" }), 1, on);
    expect(r.send).toBe(false);
    expect(r.reason).toContain("iCloud-låst");
  });

  it("never sends above the cap", () => {
    const r = shouldAutoSend(suggestion({ totalAimOre: 400001 }), 1, on);
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/loft/i);
  });

  it("sends at exactly the cap", () => {
    expect(shouldAutoSend(suggestion({ totalAimOre: 400000 }), 1, on).send).toBe(true);
  });

  it("never sends a multi-device lead", () => {
    const r = shouldAutoSend(suggestion(), 2, on);
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/flere enheder/i);
  });

  it("never sends a lead with no devices", () => {
    expect(shouldAutoSend(suggestion(), 0, on).send).toBe(false);
  });

  it("never sends a zero or negative amount", () => {
    expect(shouldAutoSend(suggestion({ totalAimOre: 0 }), 1, on).send).toBe(false);
    expect(shouldAutoSend(suggestion({ totalAimOre: -5000 }), 1, on).send).toBe(false);
  });

  it("always gives a reason, even when sending", () => {
    expect(shouldAutoSend(suggestion(), 1, on).reason.length).toBeGreaterThan(0);
  });
});
