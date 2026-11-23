import { describe, expect, it } from "vitest";
import { instantPriceCopy, sellPriceFaq } from "../sell-landing-page";

describe("sælg-sidens prisstekst", () => {
  it("skriver ikke, at prisen kommer senere, når siden viser priser", () => {
    expect(instantPriceCopy("Vi gennemgår oplysningerne og vender tilbage med et tilbud. Aflever i Vejle.")).toBe("Du ser prisen med det samme. Aflever i Vejle.");
    expect(instantPriceCopy("I formularen, og vi vender tilbage med et tilbud efter vores gennemgang.")).toBe("I formularen, og du ser prisen med det samme.");
  });

  it("lister priserne med og før den sidste lagerstørrelse", () => {
    const faq = sellPriceFaq("iPhone 15", [
      { storageGb: 128, perfectDkk: 2250 },
      { storageGb: 256, perfectDkk: 2650 },
    ]);
    expect(faq.question).toBe("Hvad giver I for en iPhone 15?");
    expect(faq.answer).toContain("2.250 kr. for 128 GB og 2.650 kr. for 256 GB");
  });
});
