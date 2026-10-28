import { describe, expect, it } from "vitest";
import { buildMegaMenu, shortName, type MenuTemplate } from "../mega-menu";

const t = (o: Partial<MenuTemplate> & { display_name: string; category: string }): MenuTemplate => ({
  brand: "Apple",
  slug: o.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  image: null,
  minPriceOre: 300000,
  stock: 1,
  ...o,
});

describe("shortName", () => {
  it("drops the Apple prefix and cellular suffix", () => {
    expect(shortName("Apple iPhone 15 Pro")).toBe("iPhone 15 Pro");
    expect(shortName("Apple iPad Pro 12.9 (2021) Wi-Fi + Cellular")).toBe("iPad Pro 12.9 (2021)");
  });
});

describe("buildMegaMenu", () => {
  const templates = [
    t({ category: "iphone", display_name: "Apple iPhone 17 Pro", minPriceOre: 800000 }),
    t({ category: "iphone", display_name: "Apple iPhone 17", image: "a.jpg", stock: 4 }),
    t({ category: "iphone", display_name: "Apple iPhone 16" }),
    t({ category: "iphone", display_name: "Apple iPhone 15" }),
    t({ category: "iphone", display_name: "Apple iPhone 13", minPriceOre: 199900 }),
    t({ category: "iphone", display_name: "Apple iPhone 12 Pro", stock: 0 }),
    t({ category: "ipad", display_name: "Apple iPad Pro 12.9 (2021)" }),
    t({ category: "ipad", display_name: "Apple iPad 5 (2017)" }),
    t({ category: "laptop", brand: "Lenovo", display_name: "Lenovo ThinkPad T14", stock: 9 }),
  ];
  const menu = buildMegaMenu(templates, [{ slug: "budget", title: "Budget", tagline: "Til studie" }]);

  it("groups iPhones by series, newest first, and folds older series together", () => {
    expect(menu["/iphones"].groups.map((g) => g.title)).toEqual(["iPhone 17-serien", "iPhone 16-serien", "iPhone 15-serien", "Ældre iPhones"]);
    expect(menu["/iphones"].groups[0].links.map((l) => l.label)).toEqual(["iPhone 17", "iPhone 17 Pro"]);
  });

  it("only links models with stock, to their product page with a from-price in kr", () => {
    const older = menu["/iphones"].groups[3].links;
    expect(older).toEqual([{ label: "iPhone 13", href: "/refurbished/apple-iphone-13", fromKr: 1999 }]);
  });

  it("features a model with a photo", () => {
    expect(menu["/iphones"].featured).toEqual({ label: "iPhone 17", href: "/refurbished/apple-iphone-17", image: "a.jpg", fromKr: 3000 });
    expect(menu["/ipads"].featured).toBeNull();
  });

  it("orders iPad families Pro first", () => {
    expect(menu["/ipads"].groups.map((g) => g.title)).toEqual(["iPad Pro", "iPad"]);
  });

  it("gives laptops budget tiers and the models with most stock", () => {
    expect(menu["/baerbare"].groups[0].links[0]).toEqual({ label: "Budget", href: "/baerbare/budget", note: "Til studie" });
    expect(menu["/baerbare"].groups[1].links[0].label).toBe("Lenovo ThinkPad T14");
  });
});
