import { describe, expect, it } from "vitest";
import {
  deviceCanonicalPath,
  fallbackDeviceDescription,
  fallbackDeviceTitle,
} from "../device-meta";

describe("deviceCanonicalPath", () => {
  it("peger altid på /refurbished/<slug>", () => {
    expect(deviceCanonicalPath("apple-iphone-12-pro")).toBe("/refurbished/apple-iphone-12-pro");
  });
});

describe("fallbackDeviceTitle", () => {
  it("bruger brugt + 36 mdr. garanti og fjerner Apple foran", () => {
    expect(fallbackDeviceTitle("Apple iPhone 8")).toBe(
      "iPhone 8 brugt | Refurbished med 36 mdr. garanti | PhoneSpot",
    );
    expect(fallbackDeviceTitle("Apple iPhone 8").length).toBeLessThanOrEqual(60);
  });

  it("dropper midtersegmentet, hvis titlen ellers bliver over 60 tegn", () => {
    const t = fallbackDeviceTitle("Samsung Galaxy Z Fold 5 Enterprise Edition");
    expect(t).toBe("Samsung Galaxy Z Fold 5 Enterprise Edition brugt | PhoneSpot");
    expect(fallbackDeviceTitle("Apple iPhone 12 Pro")).toBe("iPhone 12 Pro brugt | PhoneSpot");
  });
});

describe("fallbackDeviceDescription", () => {
  it.each(["iphone", "ipad", "laptop", "smartwatch", "smartphone"])(
    "er højst 155 tegn og uden forbudte påstande (%s)",
    (category) => {
      const d = fallbackDeviceDescription("Apple iPhone 17 Pro Max", category);
      expect(d.length).toBeLessThanOrEqual(155);
      expect(d).not.toMatch(/30\+/);
      expect(d).not.toMatch(/14 dages/);
      expect(d).toContain("36 mdr. garanti");
      expect(d).toContain("30 dages returret");
    },
  );

  it("nævner batteri min. 90 % for telefoner og tablets, ikke for bærbare", () => {
    expect(fallbackDeviceDescription("iPhone 13", "iphone")).toContain("Batteri min. 90 %");
    expect(fallbackDeviceDescription("iPad 9", "ipad")).toContain("Batteri min. 90 %");
    expect(fallbackDeviceDescription("MacBook Air M2", "laptop")).not.toContain("Batteri");
  });
});
