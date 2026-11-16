import { describe, expect, it } from "vitest";
import { actorLabel, canManageStock, canRequestTo, hasLagerAccess, isPhoneSpotLocation, LOCATION_LABELS, locationForStore, storesForLocation } from "../locations";

describe("locationForStore", () => {
  it("maps each store to its lagersystem location", () => {
    expect(locationForStore("vejle")).toBe("vejle-hub");
    expect(locationForStore("slagelse")).toBe("phonespot-slagelse");
    expect(locationForStore("esbjerg")).toBe("phonespot-esbjerg");
    expect(locationForStore(" Vejle ")).toBe("vejle-hub");
  });
  it("returns null for Generel and unknown stores, so staff must choose", () => {
    expect(locationForStore(null)).toBeNull();
    expect(locationForStore(undefined)).toBeNull();
    expect(locationForStore("")).toBeNull();
    expect(locationForStore("odense")).toBeNull();
  });
});

describe("isPhoneSpotLocation", () => {
  it("accepts only PhoneSpot-relevant codes", () => {
    expect(isPhoneSpotLocation("vejle-hub")).toBe(true);
    expect(isPhoneSpotLocation("fixon-van-1")).toBe(false);
    expect(isPhoneSpotLocation(42)).toBe(false);
  });
});

describe("labels", () => {
  it("names the hub for humans", () => {
    expect(LOCATION_LABELS["vejle-hub"]).toBe("Hovedlager Vejle");
  });
  it("actorLabel prefers name, then email", () => {
    expect(actorLabel({ name: "Maria", email: "m@phonespot.dk" })).toBe("PhoneSpot-admin: Maria");
    expect(actorLabel({ name: null, email: "m@phonespot.dk" })).toBe("PhoneSpot-admin: m@phonespot.dk");
    expect(actorLabel({ name: " ", email: null })).toBe("PhoneSpot-admin: ukendt medarbejder");
  });
});


describe("storesForLocation", () => {
  it("is the reverse of locationForStore", () => {
    expect(storesForLocation("vejle-hub")).toEqual(["vejle"]);
    expect(storesForLocation("phonespot-slagelse")).toEqual(["slagelse"]);
    expect(storesForLocation("phonespot-esbjerg")).toEqual(["esbjerg"]);
  });
});

describe("transfer permissions (spec §3.5 Rettigheder)", () => {
  const owner = { role: "owner", location_slug: null };
  const slagelse = { role: "employee", location_slug: "slagelse" };
  const webshop = { role: "employee", location_slug: "webshop" };
  it("only owner and manager manage stock", () => {
    expect(canManageStock(owner)).toBe(true);
    expect(canManageStock({ role: "manager" })).toBe(true);
    expect(canManageStock(slagelse)).toBe(false);
  });
  it("lager access needs the owner or a store with a lagersystem location", () => {
    expect(hasLagerAccess(owner)).toBe(true);
    expect(hasLagerAccess(slagelse)).toBe(true);
    expect(hasLagerAccess(webshop)).toBe(false);
    expect(hasLagerAccess({ role: "employee", location_slug: null })).toBe(false);
  });
  it("requests may go to Hovedlager Vejle or the requester's own store", () => {
    expect(canRequestTo(slagelse, "vejle-hub")).toBe(true);
    expect(canRequestTo(slagelse, "phonespot-slagelse")).toBe(true);
    expect(canRequestTo(slagelse, "phonespot-esbjerg")).toBe(false);
    expect(canRequestTo(webshop, "vejle-hub")).toBe(false);
    expect(canRequestTo(owner, "phonespot-esbjerg")).toBe(true);
    expect(canRequestTo(owner, "fixon-office")).toBe(false);
  });
});
