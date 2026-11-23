import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/buyback/admin-fetch", () => ({ staffFetch: vi.fn() }));

import {
  groupOf,
  groupsWithModels,
  modelsIn,
  otherTemplate,
  searchCatalog,
  shortLabel,
  storageChoices,
  templateLabel,
  type Template,
} from "../_components/model-catalog";

const t = (id: string, brand: string, name: string, category: string, storage: string[] = []): Template => ({
  id,
  brand,
  model: name,
  display_name: name,
  category,
  storage_options: storage,
});

const CATALOG: Template[] = [
  t("se", "Apple", "Apple iPhone SE (2020)", "iphone"),
  t("13", "Apple", "Apple iPhone 13", "iphone", ["128GB", "256GB"]),
  t("13p", "Apple", "Apple iPhone 13 Pro", "iphone"),
  t("17", "Apple", "Apple iPhone 17", "iphone"),
  t("air", "Apple", "Apple iPad Air 11 M2", "ipad"),
  t("s24", "Samsung", "Samsung Galaxy S24 Ultra", "smartphone"),
  t("px", "Google", "Google Pixel 9", "smartphone"),
  t("mba", "Apple", "Apple MacBook Air 13 M2", "laptop"),
  t("x1", "Lenovo", "Lenovo Thinkpad X1 Carbon G7", "laptop"),
  t("aw", "Apple", "Apple Watch SE (2024)", "smartwatch"),
  t("o-tel", "Andet", "Andet (telefon)", "smartphone"),
  t("o-pc", "Andet", "Andet (computer)", "laptop"),
];

describe("model-catalog", () => {
  it("places each model in the group staff would look under", () => {
    const group = (id: string) => groupOf(CATALOG.find((x) => x.id === id)!);
    expect(group("13")).toBe("iphone");
    expect(group("air")).toBe("ipad");
    expect(group("s24")).toBe("samsung");
    expect(group("px")).toBe("telefon");
    expect(group("mba")).toBe("mac");
    expect(group("x1")).toBe("computer");
    expect(group("aw")).toBe("ur");
  });

  it("lists only groups that have models, and never the 'Andet' carriers", () => {
    expect(groupsWithModels(CATALOG).map((g) => g.key)).toEqual(["iphone", "ipad", "samsung", "telefon", "mac", "computer", "ur"]);
    expect(modelsIn(CATALOG, "telefon").map((x) => x.id)).toEqual(["px"]);
  });

  it("shows the newest iPhone first and models without a number last", () => {
    expect(modelsIn(CATALOG, "iphone").map((x) => shortLabel(x, "iphone"))).toEqual([
      "iPhone 17",
      "iPhone 13 Pro",
      "iPhone 13",
      "iPhone SE (2020)",
    ]);
  });

  it("never repeats the brand in a label", () => {
    expect(templateLabel({ brand: "Apple", model: "iPhone 13", display_name: "Apple iPhone 13" })).toBe("Apple iPhone 13");
    expect(templateLabel({ brand: "Apple", model: "iPhone 13", display_name: "iPhone 13" })).toBe("Apple iPhone 13");
  });

  it("finds a model from partial words in any order", () => {
    expect(searchCatalog(CATALOG, "iph 13").map((x) => x.id)).toEqual(["13", "13p"]);
    expect(searchCatalog(CATALOG, "pro 13").map((x) => x.id)).toEqual(["13p"]);
    expect(searchCatalog(CATALOG, "andet")).toEqual([]);
  });

  it("stores a free-text model on the 'Andet' template of the same kind", () => {
    expect(otherTemplate(CATALOG, "samsung")?.id).toBe("o-tel");
    expect(otherTemplate(CATALOG, "computer")?.id).toBe("o-pc");
    expect(otherTemplate(CATALOG, "ur")).toBeNull();
  });

  it("offers the model's own storage sizes, else the usual ones for the kind", () => {
    expect(storageChoices(CATALOG.find((x) => x.id === "13")!, [])).toEqual(["128GB", "256GB"]);
    expect(storageChoices(CATALOG.find((x) => x.id === "s24")!, [])).toContain("256GB");
    expect(storageChoices(CATALOG.find((x) => x.id === "aw")!, [])).toEqual([]);
  });
});
