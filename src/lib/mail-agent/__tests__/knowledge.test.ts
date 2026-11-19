import { describe, it, expect } from "vitest";
import { PHONESPOT_PROMISES } from "@/lib/promises";
import { buildKnowledge, FORBIDDEN_WORDS } from "@/lib/mail-agent/knowledge";

describe("buildKnowledge", () => {
  const text = buildKnowledge();

  it("says we no longer sell spare parts", () => {
    expect(text).toContain("Vi sælger ikke reservedele");
    expect(text).not.toContain("- Reservedele til reparation.");
  });

  it("names both stores with hours and phone", () => {
    expect(text).toContain("PhoneSpot Slagelse");
    expect(text).toContain("PhoneSpot Vejle");
    expect(text).toContain("+45 61 10 00 48");
    expect(text).toMatch(/Mandag til fredag/);
  });

  it("states the warranty split", () => {
    expect(text).toContain("36 måneders garanti");
    expect(text).toContain("2 års reklamationsret");
  });

  it("states lifetime and battery warranty, 30 days return and repair times", () => {
    expect(text).toContain("livstidsgaranti");
    expect(text).toContain("6 måneders garanti");
    expect(text).toContain("30 dages returret");
    expect(text).not.toContain("Onlinekøb: 14 dages");
    expect(text).toContain("## Reparationstider");
    expect(text).toContain("30–60 minutter");
    expect(text).toContain("gratis diagnose");
  });

  it("renders the six promises from promises.ts", () => {
    expect(PHONESPOT_PROMISES).toHaveLength(6);
    for (const p of PHONESPOT_PROMISES) {
      expect(text).toContain(p.title);
      expect(text).toContain(p.detail);
    }
  });

  it("keeps the fixed prices", () => {
    expect(text).toContain("899 kr.");
    expect(text).toContain("1.300 kr.");
    expect(text).toContain("1.599 kr.");
  });

  it("contains no forbidden words", () => {
    for (const w of FORBIDDEN_WORDS) {
      expect(text.toLowerCase()).not.toContain(w.toLowerCase());
    }
  });
});
