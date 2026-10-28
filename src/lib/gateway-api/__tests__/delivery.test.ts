import { describe, it, expect, beforeEach } from "vitest";
import { normalizeMsisdn, signDeliveryKey, verifyDeliveryKey, deliveryCallbackUrl } from "../delivery";

describe("normalizeMsisdn", () => {
  it("prefixes 45 on a bare Danish number", () => {
    expect(normalizeMsisdn("40982198")).toBe("4540982198");
    expect(normalizeMsisdn("40 98 21 98")).toBe("4540982198");
  });

  it("keeps a number that already carries the country code", () => {
    expect(normalizeMsisdn("+4540982198")).toBe("4540982198");
    expect(normalizeMsisdn("4540982198")).toBe("4540982198");
    expect(normalizeMsisdn("004540982198")).toBe("4540982198");
    expect(normalizeMsisdn("+45 40 98 21 98")).toBe("4540982198");
  });
});

describe("delivery callback key", () => {
  beforeEach(() => {
    process.env.GATEWAYAPI_TOKEN = "test-token";
  });

  it("accepts its own key and rejects anything else", () => {
    const key = signDeliveryKey();
    expect(verifyDeliveryKey(key)).toBe(true);
    expect(verifyDeliveryKey(key.slice(0, -1) + "0")).toBe(key.endsWith("0"));
    expect(verifyDeliveryKey("")).toBe(false);
    expect(verifyDeliveryKey(null)).toBe(false);
  });

  it("puts the key on the webhook URL", () => {
    expect(deliveryCallbackUrl()).toMatch(/\/api\/webhooks\/gatewayapi\?k=[0-9a-f]{32}$/);
  });
});
