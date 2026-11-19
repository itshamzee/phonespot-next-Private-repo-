import { describe, expect, it } from "vitest";
import { GRADE_SHORT_LABEL } from "@/lib/grades";
import { buildKnowledge, FORBIDDEN_WORDS } from "@/lib/mail-agent/knowledge";
import { PHONESPOT_PROMISES } from "@/lib/promises";

describe("knowledge: Stand og kvalitet", () => {
  const text = buildKnowledge();
  const section = text.slice(text.indexOf("## Stand og kvalitet"), text.indexOf("## Garanti og rettigheder"));

  it("explains every stand with the site's own labels", () => {
    expect(section.length).toBeGreaterThan(100);
    for (const g of ["N", "P", "A", "B", "C"] as const) {
      const label = g === "N" ? GRADE_SHORT_LABEL.N : `Stand ${g} · ${GRADE_SHORT_LABEL[g]}`;
      expect(section).toContain(`- ${label}: `);
    }
    expect(section).toContain("Fabriksny er ikke refurbished.");
  });

  it("takes the battery and part-status promises from promises.ts", () => {
    for (const title of ["Batteri min. 90 % ved levering", "Vi oplyser delstatus"]) {
      const p = PHONESPOT_PROMISES.find((x) => x.title === title)!;
      expect(section).toContain(`${p.title}: ${p.detail}`);
    }
    expect(section).toContain("Graden siger ikke noget om batteriprocenten.");
  });

  it("covers testing, seeing the device first and links the quality page", () => {
    expect(section).toContain("over 30 kontrolpunkter");
    expect(section).toContain("Besøg os i Vejle eller Slagelse");
    expect(section).toContain("https://phonespot.dk/kvalitet");
  });

  it("contains no forbidden words", () => {
    for (const w of FORBIDDEN_WORDS) expect(section.toLowerCase()).not.toContain(w);
  });
});
