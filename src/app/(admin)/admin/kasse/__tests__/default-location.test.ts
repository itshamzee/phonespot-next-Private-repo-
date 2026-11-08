import { describe, it, expect } from "vitest";
import { exactSlugMatch, fallbackLocation } from "../_components/default-location";

const locs = [
  { id: "e", name: "PhoneSpot Esbjerg", slug: "esbjerg" },
  { id: "g", name: "PhoneSpot Vejle gågade", slug: "vejle-gaagade" },
  { id: "s", name: "PhoneSpot Slagelse", slug: "slagelse" },
  { id: "v", name: "PhoneSpot Vejle", slug: "vejle" },
];

describe("default butik i kassen", () => {
  it("matcher slug præcist for alle scopes", () => {
    expect(exactSlugMatch(locs, "vejle-gaagade")?.id).toBe("g");
    expect(exactSlugMatch(locs, "vejle")?.id).toBe("v");
    expect(exactSlugMatch(locs, "alle")).toBeNull();
    expect(exactSlugMatch(locs, null)).toBeNull();
  });

  it("ejer uden match: åben kasse først, ellers Vejle (ikke Esbjerg), ellers første", () => {
    expect(fallbackLocation(locs, new Set(["s"])).id).toBe("s");
    expect(fallbackLocation(locs, new Set()).id).toBe("v");
    expect(fallbackLocation([locs[0], locs[2]], new Set()).id).toBe("e");
  });
});
