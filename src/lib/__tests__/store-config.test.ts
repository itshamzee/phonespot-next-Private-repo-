import { describe, it, expect } from "vitest";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";

describe("store config", () => {
  it("Vejle maps URL matches the street address (3B)", () => {
    expect(STORES.vejle.street).toBe("Løversysselvej 3B");
    expect(STORES.vejle.googleMapsUrl).toContain("3B");
    // Note: a bare /3A/ alternative would false-positive on the unrelated
    // place-ID hash segment (`...a1%3A0x0...`), which coincidentally contains
    // "3A" as part of a percent-encoded colon. Assert on the actual street
    // token instead of a substring that can appear anywhere in the URL.
    expect(STORES.vejle.googleMapsEmbed).not.toMatch(/%C3%B8versysselvej\+3A(?![0-9A-Za-z])/);
  });

  it("JSON-LD opening hours derive from each store's configured hours", () => {
    expect(openingHoursJsonLd(STORES.vejle.hours)).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "10:00", closes: "17:30" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday"], opens: "10:00", closes: "15:00" },
    ]);
    expect(openingHoursJsonLd(STORES.slagelse.hours)[0]).toMatchObject({ opens: "10:00", closes: "19:00" });
  });
});
