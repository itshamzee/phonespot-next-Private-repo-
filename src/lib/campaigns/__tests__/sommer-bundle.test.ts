import { describe, it, expect } from "vitest";
import {
  SOMMER_BUNDLE_2026,
  isCampaignActive,
  getTpuCaseSkuId,
  TPU_CASE_BY_TEMPLATE_ID,
} from "../sommer-bundle";

describe("Sommer Bundle 2026 campaign config", () => {
  it("is active during the campaign window (Copenhagen time)", () => {
    expect(isCampaignActive(new Date("2026-05-26T12:00:00+02:00"))).toBe(true);
    expect(isCampaignActive(new Date("2026-06-30T23:00:00+02:00"))).toBe(true);
  });

  it("is not active before the start", () => {
    expect(isCampaignActive(new Date("2026-05-25T23:59:00+02:00"))).toBe(false);
  });

  it("is not active after the end", () => {
    expect(isCampaignActive(new Date("2026-07-01T00:01:00+02:00"))).toBe(false);
  });

  it("returns the configured Tempered Glass SKU id", () => {
    expect(SOMMER_BUNDLE_2026.glassSkuId).toBe("0a718861-eae0-4c83-8cea-70d114a89fea");
  });

  it("returns null for an unknown template id", () => {
    expect(getTpuCaseSkuId("does-not-exist")).toBeNull();
  });

  it("has at least one TPU mapping populated", () => {
    expect(Object.keys(TPU_CASE_BY_TEMPLATE_ID).length).toBeGreaterThan(0);
  });
});
