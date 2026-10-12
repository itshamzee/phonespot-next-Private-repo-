import { describe, it, expect } from "vitest";
import { STORES, UPCOMING_STORES, openingHoursJsonLd } from "@/lib/store-config";
import { STORE_IDS } from "@/lib/stores";

describe("store config", () => {
  it("Slagelse street includes the building + unit number (10A, 103)", () => {
    expect(STORES.slagelse.street).toBe("VestsjællandsCentret 10A, 103");
    // The Maps query intentionally targets the mall itself, not the specific
    // unit — geocoding "...10A, 103, 4200 Slagelse" returns zero results,
    // while the mall-only query resolves reliably. Assert the exact value
    // (not just a substring) so a future edit can't silently drift back to
    // an unresolvable, over-precise query.
    expect(STORES.slagelse.googleMapsUrl).toBe(
      "https://maps.google.com/?q=VestsjællandsCentret+10,+4200+Slagelse",
    );
  });

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

  it("keeps announced stores out of STORES so checkout, booking and mail never offer them", () => {
    for (const slug of Object.keys(UPCOMING_STORES)) {
      expect(STORES[slug]).toBeUndefined();
      expect(STORE_IDS as readonly string[]).not.toContain(slug);
    }
    expect(UPCOMING_STORES.esbjerg).toMatchObject({ mall: "Esbjerg Storcenter", street: "Gl. Vardevej 230", zip: "6715" });
  });
});
