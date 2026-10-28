import { describe, expect, it } from "vitest";
import { matchModelText } from "../model-text";

describe("matchModelText", () => {
  it("finder Samsung-modeller ud fra kort tekst", () => {
    expect(matchModelText("A32 5G")).toEqual(["samsung-a32"]);
    expect(matchModelText("Galaxy S20 Ultra")).toEqual(["samsung-s20-ultra"]);
    expect(matchModelText("Samsung Galaxy S20+")).toEqual(["samsung-s20-plus"]);
  });
  it("finder iPhones og delte modeller", () => {
    expect(matchModelText("iPhone 13 mini")).toEqual(["iphone-13-mini"]);
    expect(matchModelText("iPhone 12/12 Pro")).toEqual(["iphone-12", "iphone-12-pro"]);
  });
  it("returnerer tomt ved ukendt tekst", () => {
    expect(matchModelText("Nokia 3310")).toEqual([]);
  });
});
