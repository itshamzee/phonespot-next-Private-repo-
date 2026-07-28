import { describe, expect, it } from "vitest";
import { STORE_IDS, isStoreId, normalizeStoreId, storeLabel } from "../stores";

describe("STORE_IDS", () => {
  it("indeholder præcis de to butikker", () => {
    expect(STORE_IDS).toEqual(["slagelse", "vejle"]);
  });
});

describe("isStoreId", () => {
  it("accepterer gyldige slugs", () => {
    expect(isStoreId("slagelse")).toBe(true);
    expect(isStoreId("vejle")).toBe(true);
  });

  it("afviser store bogstaver og whitespace (ingen normalisering)", () => {
    expect(isStoreId("Vejle")).toBe(false);
    expect(isStoreId(" vejle ")).toBe(false);
  });

  it("afviser ikke-strenge og ukendte værdier", () => {
    expect(isStoreId(null)).toBe(false);
    expect(isStoreId(undefined)).toBe(false);
    expect(isStoreId(42)).toBe(false);
    expect(isStoreId("odense")).toBe(false);
    expect(isStoreId("")).toBe(false);
  });
});

describe("normalizeStoreId", () => {
  it("returnerer gyldige slugs uændret", () => {
    expect(normalizeStoreId("slagelse")).toBe("slagelse");
    expect(normalizeStoreId("vejle")).toBe("vejle");
  });

  it("normaliserer store/små bogstaver", () => {
    expect(normalizeStoreId("Vejle")).toBe("vejle");
    expect(normalizeStoreId("SLAGELSE")).toBe("slagelse");
    expect(normalizeStoreId("SlAgElSe")).toBe("slagelse");
  });

  it("trimmer whitespace", () => {
    expect(normalizeStoreId(" vejle ")).toBe("vejle");
    expect(normalizeStoreId("\tSlagelse\n")).toBe("slagelse");
  });

  it("returnerer null for null/undefined/tal", () => {
    expect(normalizeStoreId(null)).toBeNull();
    expect(normalizeStoreId(undefined)).toBeNull();
    expect(normalizeStoreId(42)).toBeNull();
    expect(normalizeStoreId({})).toBeNull();
  });

  it("returnerer null for ukendte og tomme strenge", () => {
    expect(normalizeStoreId("odense")).toBeNull();
    expect(normalizeStoreId("PhoneSpot Vejle")).toBeNull();
    expect(normalizeStoreId("")).toBeNull();
    expect(normalizeStoreId("   ")).toBeNull();
  });
});

describe("storeLabel", () => {
  it("giver bynavne for gyldige slugs", () => {
    expect(storeLabel("vejle")).toBe("Vejle");
    expect(storeLabel("slagelse")).toBe("Slagelse");
  });

  it("giver Generel for null", () => {
    expect(storeLabel(null)).toBe("Generel");
  });
});
