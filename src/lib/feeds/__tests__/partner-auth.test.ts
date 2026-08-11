import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkPartnerAuth } from "../partner-auth";

let originalToken: string | undefined;

beforeEach(() => {
  originalToken = process.env.PARTNER_FEED_TOKEN;
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.PARTNER_FEED_TOKEN;
  else process.env.PARTNER_FEED_TOKEN = originalToken;
});

function headersWith(init: Record<string, string> = {}): Headers {
  return new Headers(init);
}

describe("checkPartnerAuth", () => {
  it("returns 503 when PARTNER_FEED_TOKEN is not configured, even with a token supplied", () => {
    delete process.env.PARTNER_FEED_TOKEN;
    const result = checkPartnerAuth(headersWith({ "x-api-key": "anything" }));
    expect(result).toEqual({ ok: false, status: 503 });
  });

  it("returns 503 when no token header is supplied either", () => {
    delete process.env.PARTNER_FEED_TOKEN;
    const result = checkPartnerAuth(headersWith());
    expect(result).toEqual({ ok: false, status: 503 });
  });

  it("returns 401 for a wrong X-Api-Key token", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(headersWith({ "x-api-key": "wrong-token" }));
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 401 for a wrong Bearer token", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(headersWith({ authorization: "Bearer wrong-token" }));
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 401 when no token is provided at all", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(headersWith());
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 401 for a token that differs only in length", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(headersWith({ "x-api-key": "correct-token-12" }));
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("accepts a correct X-Api-Key token", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(headersWith({ "x-api-key": "correct-token-123" }));
    expect(result).toEqual({ ok: true });
  });

  it("accepts a correct Bearer token", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(headersWith({ authorization: "Bearer correct-token-123" }));
    expect(result).toEqual({ ok: true });
  });

  it("prefers X-Api-Key over Authorization when both are present", () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token-123";
    const result = checkPartnerAuth(
      headersWith({ "x-api-key": "correct-token-123", authorization: "Bearer garbage" }),
    );
    expect(result).toEqual({ ok: true });
  });
});
