import { describe, expect, it } from "vitest";
import {
  LOCAL_SERVICE_KEYS,
  getAllLocalServicePages,
  getLocalServicePage,
  localServiceKeyForBrand,
} from "@/lib/local-service-pages";

const pages = getAllLocalServicePages();

describe("lokale ydelsessider", () => {
  it("har én side pr. by og ydelse med korrekt sti", () => {
    expect(pages).toHaveLength(6);
    for (const p of pages) expect(p.path).toBe(`/reparation-${p.store}/${p.key}`);
  });

  it("har unikke titler, beskrivelser og H1", () => {
    for (const field of ["metaTitle", "metaDescription", "h1", "heroLead", "answerFirst"] as const) {
      expect(new Set(pages.map((p) => p[field])).size).toBe(pages.length);
    }
  });

  it("holder titler og beskrivelser inden for Googles grænser", () => {
    for (const p of pages) {
      expect(p.metaTitle.length, p.metaTitle).toBeLessThanOrEqual(60);
      expect(p.metaDescription.length, p.metaDescription).toBeLessThanOrEqual(170);
    }
  });

  it("nævner sin egen by og ikke den anden butiks adresse", () => {
    for (const p of pages) {
      const text = [p.metaTitle, p.h1, p.heroLead, p.answerFirst, ...p.intro, ...p.faqs.map((f) => f.answer)].join(" ");
      expect(p.h1).toContain(p.city);
      if (p.store === "vejle") expect(text).not.toMatch(/VestsjællandsCentret/);
      if (p.store === "slagelse") expect(text).not.toMatch(/Løversysselvej/);
    }
  });

  it("afslører aldrig Esbjergs placering og bruger ikke forbudte ord", () => {
    const all = JSON.stringify(pages);
    expect(all).not.toMatch(/Storcenter|Vardevej|6715/);
    expect(all).not.toMatch(/Foxway|dropship|Panserglas|Trustpilot/i);
    expect(all).not.toMatch(/36 måneders garanti/);
  });

  it("lover kun 2 års garanti på konsolsiderne", () => {
    for (const p of pages) {
      const mentions2y = JSON.stringify(p).includes("2 års garanti");
      expect(mentions2y, p.path).toBe(p.key === "playstation");
    }
  });

  it("afviser ukendte ydelser", () => {
    expect(getLocalServicePage("vejle", "iphone")).toBeNull();
    expect(LOCAL_SERVICE_KEYS).toEqual(["ipad", "playstation", "computer"]);
  });

  it("kobler reparationsmærker til den rigtige lokale side", () => {
    expect(localServiceKeyForBrand("ipad")).toBe("ipad");
    expect(localServiceKeyForBrand("macbook")).toBe("computer");
    expect(localServiceKeyForBrand("xbox")).toBe("playstation");
    expect(localServiceKeyForBrand("iphone")).toBeNull();
  });
});
