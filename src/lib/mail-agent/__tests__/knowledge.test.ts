import { describe, it, expect } from "vitest";
import { buildKnowledge, FORBIDDEN_WORDS } from "@/lib/mail-agent/knowledge";

describe("buildKnowledge", () => {
  const text = buildKnowledge();

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

  it("contains no forbidden words", () => {
    for (const w of FORBIDDEN_WORDS) {
      expect(text.toLowerCase()).not.toContain(w.toLowerCase());
    }
  });
});
