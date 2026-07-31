import { describe, it, expect } from "vitest";
import {
  getShippingOptions,
  getShippingOption,
  getShippingPrice,
  pickupCarrierProduct,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/shipping";

describe("what a customer can choose", () => {
  it("offers a free parcel shop and a 39 kr door delivery", () => {
    const offered = getShippingOptions().filter((o) => !o.method.startsWith("click_collect_"));
    expect(offered.map((o) => o.method)).toEqual(["pakkeshop", "postnord"]);
    expect(offered.find((o) => o.method === "pakkeshop")?.price).toBe(0);
    expect(offered.find((o) => o.method === "postnord")?.price).toBe(3900);
  });

  it("never offers DAO — the account has no agreement with them", () => {
    const methods = getShippingOptions().map((o) => o.method);
    expect(methods).not.toContain("dao");
    expect(methods).not.toContain("dao_pickup");
  });

  it("keeps collection in both stores free", () => {
    const collect = getShippingOptions().filter((o) => o.method.startsWith("click_collect_"));
    expect(collect.length).toBe(2);
    for (const option of collect) expect(option.price).toBe(0);
  });

  it("requires a shop for the parcel shop option and not for the door", () => {
    expect(getShippingOption("pakkeshop")?.requires_pickup_point).toBe(true);
    expect(getShippingOption("postnord")?.requires_pickup_point).toBe(false);
  });
});

describe("pricing an order", () => {
  it("prices what the checkout page shows", () => {
    // The page renders getShippingOptions and the session charges
    // getShippingPrice. If these disagree, the customer is billed something
    // other than what they picked — which is exactly what used to happen.
    for (const option of getShippingOptions()) {
      expect(getShippingPrice(option.method)).toBe(option.price);
    }
  });

  it("still resolves methods from orders placed before the prices changed", () => {
    expect(getShippingPrice("dao")).toBe(4900);
    expect(getShippingPrice("gls_home")).toBe(4900);
    expect(getShippingPrice("postnord_home")).toBe(5500);
  });

  it("treats in-store collection as free", () => {
    expect(getShippingPrice("pickup_slagelse")).toBe(0);
    expect(getShippingPrice("pickup_vejle")).toBe(0);
    expect(getShippingPrice("free")).toBe(0);
  });

  it("rejects a method it does not know", () => {
    expect(getShippingPrice("helikopter")).toBeUndefined();
  });

  it("keeps free shipping at 500 kr", () => {
    // The Google and PriceRunner feeds promise free shipping without
    // qualification; every phone clears this threshold.
    expect(FREE_SHIPPING_THRESHOLD).toBe(50000);
  });
});

describe("booking the parcel the customer chose", () => {
  it("follows the carrier of the chosen shop", () => {
    expect(pickupCarrierProduct("gls").product_code).toBe("GLSDK_SD");
    expect(pickupCarrierProduct("pdk").product_code).toBe("PDK_MC");
  });

  it("falls back to PostNord for an unfamiliar carrier", () => {
    expect(pickupCarrierProduct("noget_andet").carrier_code).toBe("pdk");
  });
});
