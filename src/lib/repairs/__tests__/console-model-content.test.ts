import { describe, expect, it } from "vitest";
import {
  consolePricesFrom,
  getConsoleModelPage,
  hasConsoleModelContent,
} from "../console-model-content";

const PS5_SERVICES = [
  { slug: "rens-koelepasta", price_dkk: 899 },
  { slug: "hdmi-port-rengoering", price_dkk: 1300 },
  { slug: "hdmi-port", price_dkk: 1599 },
  { slug: "blaeser", price_dkk: 899 },
  { slug: "termisk-pasta", price_dkk: 499 },
  { slug: "controller-reparation", price_dkk: 599 },
  { slug: "diagnostik", price_dkk: 299 },
];
const prices = consolePricesFrom(PS5_SERVICES);
const PS5_FAMILY = ["playstation-5", "playstation-5-digital", "playstation-5-pro"];
const ALL = [...PS5_FAMILY, "playstation-4", "playstation-4-pro", "xbox-series-x", "xbox-series-s"];
const pages = ALL.map((slug) => ({ slug, page: getConsoleModelPage(slug, prices)! }));
const text = (p: NonNullable<ReturnType<typeof getConsoleModelPage>>) =>
  [p.title, p.description, p.h1, p.answer, ...p.about, ...p.faqs.flatMap((f) => [f.question, f.answer])].join(" ");

describe("konsollernes modelsider", () => {
  it("læser priser fra ydelsernes slug", () => {
    expect(prices).toEqual({ clean: 899, bundle: 1300, hdmi: 1599, fan: 899, controller: 599 });
  });

  it("har indhold til alle konsoller med rens, men ikke til controllere", () => {
    for (const slug of ALL) expect(hasConsoleModelContent(slug)).toBe(true);
    expect(getConsoleModelPage("dualsense-controller", prices)).toBeNull();
  });

  it("giver PS5, PS5 Digital og PS5 Pro hver deres titel, H1, svar og tekst", () => {
    for (const field of ["title", "description", "h1", "answer", "aboutHeading"] as const) {
      expect(new Set(pages.map(({ page }) => page[field])).size, field).toBe(pages.length);
    }
    const abouts = pages.flatMap(({ page }) => page.about);
    expect(new Set(abouts).size).toBe(abouts.length);
  });

  it("målretter søgeordet i titlen og holder Googles grænser", () => {
    const keyword: Record<string, string> = {
      "playstation-5": "PS5 reparation",
      "playstation-5-digital": "PS5 Digital reparation",
      "playstation-5-pro": "PS5 Pro reparation",
      "playstation-4": "PlayStation 4 reparation",
    };
    for (const { slug, page } of pages) {
      expect(page.title.length, page.title).toBeLessThanOrEqual(60);
      expect(page.description.length, page.description).toBeLessThanOrEqual(160);
      if (keyword[slug]) expect(page.title.startsWith(keyword[slug]), page.title).toBe(true);
      expect(page.title).toContain("899 kr.");
    }
  });

  it("starter med et svar på 40-60 ord med butikker, priser, ventetid og garanti", () => {
    for (const { page } of pages) {
      const words = page.answer.split(/\s+/).length;
      expect(words, page.answer).toBeGreaterThanOrEqual(40);
      expect(words, page.answer).toBeLessThanOrEqual(60);
      expect(page.answer).toContain("Vejle");
      expect(page.answer).toContain("Slagelse");
      expect(page.answer).toContain("899 kr.");
      expect(page.answer).toContain("1-2 hverdage");
      expect(page.answer).toContain("2 års garanti");
      expect(page.answer).toContain("sende konsollen ind");
    }
  });

  it("nævner kun flydende metal på PS5-modellerne", () => {
    for (const { slug, page } of pages) {
      expect(text(page).includes("flydende metal"), slug).toBe(PS5_FAMILY.includes(slug));
    }
  });

  it("linker til rens-guiden og de lokale konsolsider", () => {
    for (const { page } of pages) {
      const hrefs = page.links.map((l) => l.href);
      expect(hrefs).toContain("/blog/gta-6-klar-ps5-rens-koelepasta");
      expect(hrefs).toContain("/reparation-vejle/playstation");
      expect(hrefs).toContain("/reparation-slagelse/playstation");
      expect(hrefs).toContain("/reparation/indsend");
    }
  });

  it("har FAQ om rens og HDMI med prisen fra databasen", () => {
    const pro = getConsoleModelPage("playstation-5-pro", prices)!;
    const qs = pro.faqs.map((f) => f.question);
    expect(qs).toContain("Hvad koster det at rense en PS5 Pro?");
    expect(qs).toContain("Hvad koster en ny HDMI-port på PS5 Pro?");
    expect(pro.faqs.find((f) => f.question.includes("HDMI"))!.answer).toContain("1.300 kr.");
  });

  it("lover aldrig en pris, der ikke findes på modellen", () => {
    const noClean = consolePricesFrom(PS5_SERVICES.filter((s) => s.slug !== "rens-koelepasta"));
    const page = getConsoleModelPage("playstation-5-digital", noClean)!;
    expect(text(page)).not.toContain("899 kr.");
    expect(page.faqs.some((f) => f.question.includes("rense"))).toBe(false);
    expect(page.title).toBe("PS5 Digital reparation i Vejle og Slagelse | PhoneSpot");
  });

  it("bruger ikke forbudte ord eller forkerte garantier", () => {
    for (const { page } of pages) {
      const all = text(page);
      expect(all).not.toMatch(/livstid|36 m(dr|åneder)|Foxway|dropship|Panserglas|Storcenter|certificere/i);
    }
  });
});
