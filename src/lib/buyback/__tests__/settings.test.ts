import { describe, it, expect } from "vitest";
import { DEFAULT_BUYBACK_SETTINGS, loadBuybackSettings } from "../settings";
import { makeFakeClient } from "./fake-supabase";

describe("buyback settings", () => {
  it("has sane defaults (40% aim, 30% floor, 400kr min, charging cleaning ~0.9)", () => {
    expect(DEFAULT_BUYBACK_SETTINGS.targetMarginPct).toBe(0.4);
    expect(DEFAULT_BUYBACK_SETTINGS.floorMarginPct).toBe(0.3);
    expect(DEFAULT_BUYBACK_SETTINGS.floorMarginMinOre).toBe(40000);
    expect(DEFAULT_BUYBACK_SETTINGS.cleaningProbability.charging).toBeGreaterThan(0.5);
  });

  it("returns defaults when no app_settings row exists", async () => {
    const { client } = makeFakeClient({ app_settings: [] });
    const s = await loadBuybackSettings(client);
    expect(s).toEqual(DEFAULT_BUYBACK_SETTINGS);
  });

  it("merges an app_settings override over the defaults", async () => {
    const { client } = makeFakeClient({
      app_settings: [{ key: "buyback", value: { targetMarginPct: 0.45 } }],
    });
    const s = await loadBuybackSettings(client);
    expect(s.targetMarginPct).toBe(0.45); // overridden
    expect(s.floorMarginPct).toBe(0.3); // default preserved
  });
});
