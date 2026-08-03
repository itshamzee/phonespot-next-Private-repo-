import { describe, it, expect } from "vitest";
import { parsePostalCity, isDanishPostcode } from "../seller-address";

describe("parsePostalCity", () => {
  it("reads the format the form asked for", () => {
    expect(parsePostalCity("4200 Slagelse")).toEqual({ zipcode: "4200", city: "Slagelse" });
  });

  it("accepts a postcode on its own — the city is looked up later", () => {
    // Real stored value: a customer typed only "4000".
    expect(parsePostalCity("4000")).toEqual({ zipcode: "4000", city: "" });
  });

  it("forgives the mess people actually type", () => {
    expect(parsePostalCity("  9000 Aalborg  ")).toEqual({ zipcode: "9000", city: "Aalborg" });
    expect(parsePostalCity("DK-4200 Slagelse")).toEqual({ zipcode: "4200", city: "Slagelse" });
    expect(parsePostalCity("dk 7800 skive")).toEqual({ zipcode: "7800", city: "skive" });
    expect(parsePostalCity("2100 København Ø")).toEqual({ zipcode: "2100", city: "København Ø" });
  });

  it("refuses something that is not a Danish postcode", () => {
    // Real stored value: six digits, which no lookup can rescue.
    expect(parsePostalCity("213123")).toBeNull();
    expect(parsePostalCity("999")).toBeNull();
    expect(parsePostalCity("Slagelse")).toBeNull();
    expect(parsePostalCity("")).toBeNull();
    expect(parsePostalCity(null)).toBeNull();
    expect(parsePostalCity(undefined)).toBeNull();
  });

  it("refuses postcodes below the Danish range", () => {
    expect(parsePostalCity("0100 Ingenting")).toBeNull();
  });
});

describe("isDanishPostcode", () => {
  it("takes 1000 through 9999 and nothing else", () => {
    expect(isDanishPostcode("1000")).toBe(true);
    expect(isDanishPostcode("9990")).toBe(true);
    expect(isDanishPostcode("0999")).toBe(false);
    expect(isDanishPostcode("10000")).toBe(false);
    expect(isDanishPostcode("abcd")).toBe(false);
  });
});
