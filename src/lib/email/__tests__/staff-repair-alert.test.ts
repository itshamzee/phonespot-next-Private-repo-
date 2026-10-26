import { describe, expect, it } from "vitest";
import { adminCaseUrl, bookingWhen, staffRepairHtml, staffRepairSubject } from "../staff-repair-alert";

describe("staff-repair-alert", () => {
  it("linker direkte til sagen i admin", () => {
    expect(adminCaseUrl("abc")).toBe("https://phonespot.dk/admin/reparationer/abc");
  });

  it("emnelinjen siger hvornår kunden kommer", () => {
    expect(
      staffRepairSubject({ storeLabel: "Vejle", what: "Google Pixel 9 Pro XL", date: "2026-10-27", time: "16:00-18:00" }),
    ).toBe("Ny reparationsanmodning (Vejle): Google Pixel 9 Pro XL, tirsdag 27. okt. kl. 16.00–18.00");
  });

  it("klarer sig uden butik, dato og tid", () => {
    expect(staffRepairSubject({ storeLabel: null, what: "2 enheder" })).toBe("Ny reparationsanmodning: 2 enheder");
    expect(bookingWhen("2026-10-29", null)).toBe("torsdag 29. okt.");
    expect(bookingWhen("ikke en dato", "10:00")).toBeNull();
  });

  it("HTML-udgaven har knappen og escaper kundens tekst", () => {
    const html = staffRepairHtml("Beskrivelse: <b>skærm</b>", "https://phonespot.dk/admin/reparationer/abc");
    expect(html).toContain('href="https://phonespot.dk/admin/reparationer/abc"');
    expect(html).toContain("Åbn sagen i admin");
    expect(html).toContain("&lt;b&gt;skærm&lt;/b&gt;");
  });
});
