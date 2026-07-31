import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  verifyShipmondoJwt,
  extractToken,
  mapCarrierStatus,
  extractTrackingNumber,
  extractStatus,
} from "../webhook";
import { CARRIER_PRODUCTS, RETIRED_PRODUCT_CODES, SENDER_ADDRESSES } from "../carriers";
import { STORES } from "@/lib/store-config";

const KEY = "test-key-0123456789";

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: object, key = KEY, alg = "HS256"): string {
  const header = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", key).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(sig)}`;
}

describe("verifyShipmondoJwt", () => {
  it("returns the payload for a correctly signed token", () => {
    const token = sign({ pkg_no: "123", status: "delivered" });
    expect(verifyShipmondoJwt(token, KEY)).toEqual({ pkg_no: "123", status: "delivered" });
  });

  it("rejects a token signed with a different key", () => {
    expect(verifyShipmondoJwt(sign({ a: 1 }, "someone-elses-key"), KEY)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = sign({ pkg_no: "123" });
    const [h, , s] = token.split(".");
    const forged = `${h}.${b64url(JSON.stringify({ pkg_no: "999" }))}.${s}`;
    expect(verifyShipmondoJwt(forged, KEY)).toBeNull();
  });

  it("refuses alg:none instead of trusting the header", () => {
    const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
    const body = b64url(JSON.stringify({ pkg_no: "123" }));
    expect(verifyShipmondoJwt(`${header}.${body}.`, KEY)).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    expect(verifyShipmondoJwt("", KEY)).toBeNull();
    expect(verifyShipmondoJwt("not.a.jwt", KEY)).toBeNull();
    expect(verifyShipmondoJwt("only.two", KEY)).toBeNull();
    expect(verifyShipmondoJwt(sign({ a: 1 }), "")).toBeNull();
  });
});

describe("extractToken", () => {
  const token = sign({ pkg_no: "1" });

  it("accepts a bare JWT body", () => {
    expect(extractToken(token)).toBe(token);
    expect(extractToken(`  ${token}\n`)).toBe(token);
  });

  it("accepts a JWT wrapped in JSON", () => {
    expect(extractToken(JSON.stringify({ token }))).toBe(token);
    expect(extractToken(JSON.stringify({ data: token }))).toBe(token);
  });

  it("returns null for anything else", () => {
    expect(extractToken("")).toBeNull();
    expect(extractToken("{not json")).toBeNull();
    expect(extractToken(JSON.stringify({ hello: "world" }))).toBeNull();
  });
});

describe("mapCarrierStatus", () => {
  it("recognises delivery", () => {
    expect(mapCarrierStatus("delivered")).toBe("delivered");
    expect(mapCarrierStatus("Leveret")).toBe("delivered");
    // An arrival at a service point is a delivery, not transit.
    expect(mapCarrierStatus("delivered_to_service_point")).toBe("delivered");
  });

  it("recognises transit", () => {
    expect(mapCarrierStatus("in_transit")).toBe("in_transit");
    expect(mapCarrierStatus("picked_up")).toBe("in_transit");
    expect(mapCarrierStatus("Undervejs")).toBe("in_transit");
  });

  it("changes nothing for a status it does not know", () => {
    // An unrecognised status must never move a parcel or mark it delivered.
    expect(mapCarrierStatus("label_printed")).toBeNull();
    expect(mapCarrierStatus("")).toBeNull();
    expect(mapCarrierStatus(null)).toBeNull();
    expect(mapCarrierStatus(42)).toBeNull();
  });
});

describe("payload extraction", () => {
  it("finds the tracking number at the top level or nested", () => {
    expect(extractTrackingNumber({ pkg_no: "00123" })).toBe("00123");
    expect(extractTrackingNumber({ shipment: { pkg_no: "00123" } })).toBe("00123");
    expect(extractTrackingNumber({ data: { tracking_number: "00456" } })).toBe("00456");
    expect(extractTrackingNumber({ nothing: true })).toBeNull();
    expect(extractTrackingNumber(null)).toBeNull();
  });

  it("finds the status at the top level or nested", () => {
    expect(extractStatus({ status: "delivered" })).toBe("delivered");
    expect(extractStatus({ shipment: { state: "in_transit" } })).toBe("in_transit");
    expect(extractStatus({})).toBeNull();
  });
});

describe("carrier and product codes", () => {
  it("uses only codes the Shipmondo account can book", () => {
    // Verified against GET /carriers and GET /products on 2026-07-31.
    const valid = new Set(["PDK_MH", "PDK_MC", "PDK_BPE", "GLSDK_SD"]);
    for (const entry of Object.values(CARRIER_PRODUCTS)) {
      expect(valid.has(entry.product_code)).toBe(true);
      expect(["pdk", "gls"]).toContain(entry.carrier_code);
    }
  });

  it("keeps the retired codes out", () => {
    // These looked plausible and were wrong for months.
    const inUse = Object.values(CARRIER_PRODUCTS).map((c) => c.product_code);
    for (const retired of RETIRED_PRODUCT_CODES) {
      expect(inUse).not.toContain(retired);
    }
  });

  it("never calls PostNord 'postnord' — Shipmondo calls it 'pdk'", () => {
    const carriers = Object.values(CARRIER_PRODUCTS).map((c) => c.carrier_code);
    expect(carriers).not.toContain("postnord");
    expect(carriers).not.toContain("dao");
  });

  it("takes the store addresses from store-config", () => {
    // The copies here said Løvegade 12 and Nørregade 22 — neither is a PhoneSpot
    // address, and a buyback return label is addressed with them.
    expect(SENDER_ADDRESSES.slagelse.address1).toBe(STORES.slagelse.street);
    expect(SENDER_ADDRESSES.slagelse.zipcode).toBe(STORES.slagelse.zip);
    expect(SENDER_ADDRESSES.vejle.address1).toBe(STORES.vejle.street);
    expect(SENDER_ADDRESSES.vejle.zipcode).toBe(STORES.vejle.zip);
  });

  it("strips the country code off the phone number for the label", () => {
    expect(SENDER_ADDRESSES.slagelse.phone).toBe("61100048");
  });
});
