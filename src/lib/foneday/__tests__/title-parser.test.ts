import { describe, expect, it } from "vitest";
import { parseFonedayTitle, parseTitleModels, titleMatchesModel } from "../title-parser";

describe("Foneday title parser", () => {
  it("In-Cell display", () => {
    const p = parseFonedayTitle("FDX Prime Display For iPhone 15 | In-Cell | Black");
    expect(p.models).toEqual(["iphone 15"]);
    expect(p.category).toBe("skaerme");
    expect(p.tiers).toEqual(["standard-incell"]);
  });

  it("Soft OLED with refresh rate parenthesis", () => {
    const t = "FDX Ultra Display For iPhone 15 (60Hz) | Soft Oled | LTPS | Black";
    const p = parseFonedayTitle(t);
    expect(p.models).toEqual(["iphone 15 (60hz)", "iphone 15"]);
    expect(p.tiers).toEqual(["premium-soft-oled"]);
    expect(titleMatchesModel(t, "iPhone 15")).toBe(true);
  });

  it("Hard OLED", () => {
    const p = parseFonedayTitle("FDX Pro Display For iPhone 13 | Hard Oled | Black");
    expect(p.tiers).toEqual(["premium-hard-oled"]);
    expect(p.models).toEqual(["iphone 13"]);
  });

  it("Refurbished display stops at colour word", () => {
    const p = parseFonedayTitle("Display (Without IC) For iPhone 11 Black Refurbished");
    expect(p.models).toEqual(["iphone 11"]);
    expect(p.category).toBe("skaerme");
    expect(p.tiers).toContain("original-pulled");
  });

  it("never matches iPhone 15 to iPhone 15 Pro or Pro Max", () => {
    const pro = "FDX Prime Display For iPhone 15 Pro | In-Cell | Black";
    expect(titleMatchesModel(pro, "iPhone 15")).toBe(false);
    expect(titleMatchesModel(pro, "iPhone 15 Pro")).toBe(true);
    expect(titleMatchesModel("Battery For iPhone 15 Pro Max Black", "iPhone 15 Pro")).toBe(false);
    expect(titleMatchesModel("Battery For iPhone 15 Pro Max Black", "iPhone 15 Pro Max")).toBe(true);
  });

  it("batteries", () => {
    expect(parseFonedayTitle("Battery For iPhone 13 | OEM-Equivalent").tiers).toEqual(["oem-equivalent"]);
    expect(parseFonedayTitle("Battery For iPhone 13 Service Pack").tiers).toEqual(["service-pack"]);
    expect(parseFonedayTitle("Battery For iPhone 13").category).toBe("batterier");
  });

  it("other categories and excluded accessories", () => {
    expect(parseFonedayTitle("Charging Port Flex For iPhone 12").category).toBe("opladningsstik");
    expect(parseFonedayTitle("Back Glass For iPhone 12 Black").category).toBe("bagcovers");
    expect(parseFonedayTitle("Rear Camera For iPhone 12").category).toBe("kameraer");
    expect(parseFonedayTitle("Display Adhesive For iPhone 12").category).toBeNull();
  });

  it("no For gives no model", () => {
    expect(parseTitleModels("Universal repair tool")).toEqual([]);
  });
});
