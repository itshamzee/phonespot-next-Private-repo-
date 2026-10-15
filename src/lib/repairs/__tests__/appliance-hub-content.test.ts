import { describe, expect, it } from "vitest";
import { getHubContent, hasLifetimeWarranty } from "../brand-hub-content";
import { PARENT_BRAND_META, PARENT_BRAND_ORDER } from "../parent-brands";

const SLUGS = ["xbox", "dyson", "roborock", "irobot", "nespresso", "delonghi"];
const APPLIANCES = SLUGS.slice(1);
const FORBIDDEN = /autorisere|officiel|certificere|panserglas|foxway|dropship|IEC/i;

function allText(slug: string, type: "console" | "appliance") {
  const c = getHubContent(slug, slug, type);
  return [c.answer("500 kr."), ...c.body, c.cityNote, ...Object.values(c.categoryNotes), ...c.faqs.flatMap((f) => [f.question, f.answer])].join("\n");
}

describe("hub-indhold til konsol og apparater", () => {
  it("har egne tekster med 4-6 FAQ og et svar paa 40-60 ord", () => {
    for (const slug of SLUGS) {
      const c = getHubContent(slug, slug, slug === "xbox" ? "console" : "appliance");
      expect(c.faqs.length).toBeGreaterThanOrEqual(4);
      expect(c.faqs.length).toBeLessThanOrEqual(6);
      const words = c.answer(null).split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(60);
    }
  });

  it("lover aldrig livstidsgaranti paa apparater og bruger 12 maaneder", () => {
    expect(hasLifetimeWarranty("appliance")).toBe(false);
    expect(hasLifetimeWarranty("console")).toBe(false);
    for (const slug of APPLIANCES) {
      const text = allText(slug, "appliance");
      expect(text).not.toMatch(/livstid/i);
      expect(text).toContain("12 måneders garanti på dele og arbejde");
    }
    expect(allText("xbox", "console")).not.toMatch(/livstid/i);
  });

  it("indeholder ingen forbudte ord", () => {
    for (const slug of SLUGS) {
      expect(allText(slug, slug === "xbox" ? "console" : "appliance")).not.toMatch(FORBIDDEN);
    }
  });

  it("Dyson er uafhaengigt og kaffemaskiner henviser til producenten", () => {
    expect(allText("dyson", "appliance")).toContain("uafhængigt værksted og ikke tilknyttet Dyson");
    expect(allText("nespresso", "appliance")).toContain("kontakte producenten først");
    expect(allText("delonghi", "appliance")).toContain("kontakte producenten først");
  });

  it("generisk appliance-indhold bruger 12 maaneder", () => {
    const c = getHubContent("ukendt", "Ukendt", "appliance");
    expect(c.answer(null)).toContain("12 måneders garanti");
    expect(c.answer(null)).not.toMatch(/livstid/i);
  });
});

describe("mærkevælger-meta", () => {
  it("har meta og rækkefølge for konsoller og apparater", () => {
    for (const slug of SLUGS) {
      expect(PARENT_BRAND_META[slug]?.name).toBeTruthy();
      expect(PARENT_BRAND_ORDER).toContain(slug);
    }
    expect(PARENT_BRAND_META.delonghi.name).toBe("De'Longhi");
    expect(PARENT_BRAND_ORDER.indexOf("xbox")).toBeLessThan(PARENT_BRAND_ORDER.indexOf("dyson"));
    expect(PARENT_BRAND_ORDER.indexOf("apple")).toBeLessThan(PARENT_BRAND_ORDER.indexOf("playstation"));
  });
});
