import { describe, expect, it } from "vitest";
import { sellHubForCategory, sellLinkForRepairModel } from "@/lib/sell-links";

describe("sellLinkForRepairModel", () => {
  it("linker en iPhone til sin egen sælg-side", () => {
    expect(sellLinkForRepairModel("iphone", "iphone-14-pro-max", "iPhone 14 Pro Max")).toEqual({
      href: "/saelg-din-enhed/iphone/iphone-14-pro-max",
      label: "Sælg iPhone 14 Pro Max",
    });
    expect(sellLinkForRepairModel("iphone", "iphone-13", "iPhone 13")?.href).toBe("/saelg-din-enhed/iphone/iphone-13");
  });

  it("samler iPhone 8, X, XR og XS på deres samlesider", () => {
    expect(sellLinkForRepairModel("iphone", "iphone-8-plus", "iPhone 8 Plus")?.href).toBe("/saelg-din-enhed/iphone/iphone-8");
    expect(sellLinkForRepairModel("iphone", "iphone-xs-max", "iPhone XS Max")?.href).toBe("/saelg-din-enhed/iphone/iphone-x");
    expect(sellLinkForRepairModel("iphone", "iphone-xr", "iPhone XR")?.href).toBe("/saelg-din-enhed/iphone/iphone-x");
  });

  it("giver intet link for iPhones, vi ikke køber", () => {
    expect(sellLinkForRepairModel("iphone", "iphone-7-plus", "iPhone 7 Plus")).toBeNull();
    expect(sellLinkForRepairModel("iphone", "iphone-6s", "iPhone 6s")).toBeNull();
  });

  it("samler Samsung-varianter på seriens side", () => {
    expect(sellLinkForRepairModel("samsung", "galaxy-s22-ultra", "Galaxy S22 Ultra")?.href).toBe("/saelg-din-enhed/samsung/galaxy-s22");
    expect(sellLinkForRepairModel("samsung", "galaxy-a56", "Galaxy A56")?.href).toBe("/saelg-din-enhed/samsung/galaxy-a");
    expect(sellLinkForRepairModel("samsung", "galaxy-tab-s10-ultra", "Galaxy Tab S10 Ultra")).toBeNull();
  });

  it("finder iPad- og MacBook-serien ud fra sluggen", () => {
    expect(sellLinkForRepairModel("ipad", "ipad-pro-13-m4-2024", "iPad Pro 13")?.href).toBe("/saelg-din-enhed/ipad/ipad-pro");
    expect(sellLinkForRepairModel("ipad", "ipad-9-gen-2021", "iPad 9. gen")?.href).toBe("/saelg-din-enhed/ipad/ipad-almindelig");
    expect(sellLinkForRepairModel("macbook", "macbook-air-13-m1", "MacBook Air 13 M1")?.href).toBe("/saelg-din-enhed/macbook/macbook-air-m1");
    expect(sellLinkForRepairModel("macbook", "macbook-pro-14-m3-pro-max", "MacBook Pro 14")?.href).toBe("/saelg-din-enhed/macbook/macbook-pro-m3");
    expect(sellLinkForRepairModel("macbook", "macbook-air-15-m4", "MacBook Air 15 M4")?.href).toBe("/saelg-din-enhed/macbook");
  });

  it("linker konsoller og controllere", () => {
    expect(sellLinkForRepairModel("playstation", "playstation-5-digital", "PlayStation 5 Digital")?.href).toBe("/saelg-din-enhed/spillekonsol/playstation-5-digital");
    expect(sellLinkForRepairModel("xbox", "xbox-one-x", "Xbox One X")?.href).toBe("/saelg-din-enhed/spillekonsol/xbox-one");
    expect(sellLinkForRepairModel("playstation", "dualsense-edge-controller", "DualSense Edge")?.href).toBe("/saelg-din-enhed/controller/dualsense-edge");
    expect(sellLinkForRepairModel("xbox", "xbox-wireless-controller", "Xbox Wireless Controller")?.href).toBe("/saelg-din-enhed/controller/xbox-controller");
  });

  it("giver intet link for mærker uden sælg-side", () => {
    expect(sellLinkForRepairModel("dyson", "dyson-v8", "Dyson V8")).toBeNull();
    expect(sellLinkForRepairModel("nespresso", "nespresso-vertuo", "Nespresso Vertuo")).toBeNull();
  });
});

describe("sellHubForCategory", () => {
  it("sender iPhone og iPad til deres hub og resten til forsiden af flowet", () => {
    expect(sellHubForCategory("iphone")).toBe("/saelg-din-enhed/iphone");
    expect(sellHubForCategory("ipad")).toBe("/saelg-din-enhed/ipad");
    expect(sellHubForCategory("laptop")).toBe("/saelg-din-enhed");
    expect(sellHubForCategory()).toBe("/saelg-din-enhed");
  });
});
