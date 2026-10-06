import { describe, expect, it } from "vitest";
import { parseFonedayTitle, parseTitleModels, titleMatchesModel } from "../title-parser";

describe("Foneday title parser", () => {
  it("In-Cell display", () => {
    const p = parseFonedayTitle("FDX Prime Display For iPhone 15 | In-Cell | Black");
    expect(p.models).toEqual(["iphone 15 | in-cell | black"]);
    expect(p.category).toBe("skaerme");
    expect(p.tiers).toEqual(["standard-incell"]);
    expect(titleMatchesModel("FDX Prime Display For iPhone 15 | In-Cell | Black", "iPhone 15")).toBe(true);
  });

  it("Soft OLED with refresh rate parenthesis", () => {
    const t = "FDX Ultra Display For iPhone 15 (60Hz) | Soft Oled | LTPS | Black";
    const p = parseFonedayTitle(t);
    expect(p.tiers).toEqual(["premium-soft-oled"]);
    expect(titleMatchesModel(t, "iPhone 15")).toBe(true);
  });

  it("Hard OLED", () => {
    const p = parseFonedayTitle("FDX Pro Display For iPhone 13 | Hard Oled | Black");
    expect(p.tiers).toEqual(["premium-hard-oled"]);
    expect(titleMatchesModel("FDX Pro Display For iPhone 13 | Hard Oled | Black", "iPhone 13")).toBe(true);
  });

  it("Refurbished display (IC in parentheses is not a chip)", () => {
    const t = "Display (Without IC) For iPhone 11 Black Refurbished";
    const p = parseFonedayTitle(t);
    expect(titleMatchesModel(t, "iPhone 11")).toBe(true);
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

  it("never lets Mini, FE or a year in parentheses match the base model", () => {
    const mini = "FDX Battery (With Adhesive) For iPhone 13 Mini OEM-Equivalent";
    expect(titleMatchesModel(mini, "iPhone 13")).toBe(false);
    expect(titleMatchesModel(mini, "iPhone 13 Mini")).toBe(true);
    expect(titleMatchesModel("Display For Samsung Galaxy S23 FE Black", "Galaxy S23")).toBe(false);
    expect(titleMatchesModel("Battery For iPhone SE (2022)", "iPhone SE")).toBe(false);
  });

  it("brand prefix, 5G suffix and + as Plus", () => {
    expect(parseTitleModels("Display For Samsung Galaxy A35 5G (SM-A356B) Black")).toEqual([
      "samsung galaxy a35 5g (sm-a356b) black",
      "galaxy a35 5g (sm-a356b) black",
    ]);
    expect(titleMatchesModel("Display For Samsung Galaxy A35 5G (SM-A356B) Black", "Galaxy A35")).toBe(true);
    expect(titleMatchesModel("Back Cover For Samsung Galaxy S25 Plus (SM-S936B) Navy", "Galaxy S25+")).toBe(true);
    expect(titleMatchesModel("Back Cover For Samsung Galaxy S25 Plus (SM-S936B) Navy", "Galaxy S25")).toBe(false);
  });

  it("excludes chips, board connectors and multipacks", () => {
    expect(parseFonedayTitle("LCD Display IC Chip (65657B0) For iPhone 13 Pro OEM-Equivalent").category).toBeNull();
    expect(parseFonedayTitle("Charging Port FPC Connector (J6400) (3 pieces) For iPhone 8 OEM-Equivalent").category).toBeNull();
    expect(parseFonedayTitle("Charging Port ( 5 Pieces , Soldering Required) For iPhone 13 Pro Blue").category).toBeNull();
  });

  it("refurbished non-display parts are not OEM-equivalent", () => {
    const p = parseFonedayTitle("Rear Housing with small parts For iPhone 14 Pro Max Gold Refurbished");
    expect(p.category).toBe("bagcovers");
    expect(p.tiers).toEqual(["refurbished", "original-pulled"]);
  });

  it("no For gives no model", () => {
    expect(parseTitleModels("Universal repair tool")).toEqual([]);
  });
});
