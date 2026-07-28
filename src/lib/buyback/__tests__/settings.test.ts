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

describe("automation settings", () => {
  it("ships with automation off and safe defaults", () => {
    expect(DEFAULT_BUYBACK_SETTINGS.autoSendEnabled).toBe(false);
    expect(DEFAULT_BUYBACK_SETTINGS.autoSendMaxOre).toBe(400000);
    expect(DEFAULT_BUYBACK_SETTINGS.holdMinutes).toBe(15);
    expect(DEFAULT_BUYBACK_SETTINGS.smsAcceptThresholdOre).toBe(300000);
    expect(DEFAULT_BUYBACK_SETTINGS.pausedReason).toBeNull();
  });

  it("lets app_settings turn automation on without disturbing the rest", async () => {
    const { client } = makeFakeClient({
      app_settings: [{ key: "buyback", value: { autoSendEnabled: true } }],
    });
    const s = await loadBuybackSettings(client);
    expect(s.autoSendEnabled).toBe(true);
    expect(s.autoSendMaxOre).toBe(400000);
    expect(s.holdMinutes).toBe(15);
    expect(s.targetMarginPct).toBe(0.4);
  });

  it("carries a pause reason through", async () => {
    const { client } = makeFakeClient({
      app_settings: [{ key: "buyback", value: { pausedReason: "Katalog forældet" } }],
    });
    expect((await loadBuybackSettings(client)).pausedReason).toBe("Katalog forældet");
  });
});
