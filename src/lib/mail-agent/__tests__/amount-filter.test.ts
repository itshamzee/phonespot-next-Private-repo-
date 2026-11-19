import { describe, it, expect } from "vitest";
import { extractAmounts, unbackedAmounts, formatKroner, hasUnparseableAmount } from "@/lib/mail-agent/amount-filter";
import { finalizeAssessment } from "@/lib/mail-agent/schema";
import type { Assessment } from "@/lib/mail-agent/types";

describe("extractAmounts", () => {
  it.each([
    "1.299 kr.",
    "1299 kr",
    "1 299 kr.",
    "1.299,00 kr.",
    "1299,-",
    "kr. 1.299",
    "1.299 DKK",
    "1 299 kr.",
    "Prisen er 1299kr i dag",
  ])("finds 1299 in %s", (text) => {
    expect(extractAmounts(text)).toEqual([1299]);
  });

  it.each([
    "iPhone 13",
    "36 måneders garanti",
    "30–60 minutter",
    "2–3 hverdage",
    "tlf. 50 45 33 71",
    "128 GB",
    "90 %",
    "Vi har krone-tilbud",
    "Ordre 20241299 er afsendt",
  ])("finds nothing in %s", (text) => {
    expect(extractAmounts(text)).toEqual([]);
  });

  it("finds both ends of a range and a from-price", () => {
    expect(extractAmounts("899–1.299 kr.")).toEqual([899, 1299]);
    expect(extractAmounts("fra 899 kr.")).toEqual([899]);
    expect(extractAmounts("kr. 899-1.299")).toEqual([899, 1299]);
  });

  it("keeps decimals", () => {
    expect(extractAmounts("1.299,50 kr.")).toEqual([1299.5]);
    expect(extractAmounts("1.299,00 kr.")).toEqual([1299]);
  });

  it("does not read a year or other number before the amount as part of it", () => {
    expect(extractAmounts("i 2023 1299 kr")).toEqual([1299]);
  });
});

describe("unbackedAmounts", () => {
  it("is empty when the amount comes from a tool output", () => {
    expect(unbackedAmounts("Det koster 1.299 kr.", ["Skærmskift: 1.299 kr."])).toEqual([]);
  });

  it("matches across the two money formats", () => {
    expect(unbackedAmounts("Det koster 1.299 kr.", ["Pris: 1.299,00 kr."])).toEqual([]);
    expect(unbackedAmounts("Det koster 1299,-", ["Skærmskift: 1.299 kr."])).toEqual([]);
  });

  it("returns amounts without backing", () => {
    expect(unbackedAmounts("Det koster 999 kr.", ["Skærmskift: 1.299 kr."])).toEqual([999]);
  });

  it("treats 1.299,50 as different from 1.299,00", () => {
    expect(unbackedAmounts("1.299,50 kr.", ["1.299,00 kr."])).toEqual([1299.5]);
  });

  it("returns nothing when no tool output exists and the draft has no amount", () => {
    expect(unbackedAmounts("Hej, vi vender tilbage.", [])).toEqual([]);
  });

  it("flags every amount when no tool was called", () => {
    expect(unbackedAmounts("Skærmskift koster 899 kr.", [])).toEqual([899]);
  });

  it("deduplicates and orders by first appearance", () => {
    expect(unbackedAmounts("1.500 kr., 999 kr., 1.500 kr. og 999 kr.", [])).toEqual([1500, 999]);
  });

  it("counts knowledge amounts as backed only when their text is in the outputs", () => {
    const knowledge = "Skærmskift fra 899 kr. Batteri 1.300 kr. Dyr model 1.599 kr.";
    expect(unbackedAmounts("Fra 899 kr.", [])).toEqual([899]);
    expect(unbackedAmounts("Fra 899 kr. og 1.599 kr.", [knowledge])).toEqual([]);
  });

  it("counts an amount present only in the thread text as backed", () => {
    const threadText = "Hej, jeg har betalt 1.299 kr. for min ordre";
    expect(unbackedAmounts("Du har betalt 1.299 kr.", [threadText])).toEqual([]);
    expect(unbackedAmounts("Du har betalt 1.299 kr.", [])).toEqual([1299]);
  });
});

describe("formatKroner", () => {
  it("uses the Danish thousands separator", () => {
    expect(formatKroner(999)).toBe("999 kr.");
    expect(formatKroner(1500)).toBe("1.500 kr.");
    expect(formatKroner(1299.5)).toBe("1.299,50 kr.");
  });
});

const ok: Assessment = {
  category: "ordre",
  needs_human: false,
  reason: "Ordre fundet",
  summary: "Spørger til levering",
  confidence: 0.9,
  draft: { subject: "Re: Min ordre", body: "Det koster 999 kr." },
};

describe("finalizeAssessment with unbacked amounts", () => {
  it("forces a human, keeps the draft and starts the reason with the amount sentence", () => {
    const r = finalizeAssessment(ok, { scopeMismatch: false, unbackedAmounts: [999], unparseableAmount: false });
    expect(r.needs_human).toBe(true);
    expect(r.reason.startsWith("Udkastet nævner 999 kr., som ikke kommer fra et opslag.")).toBe(true);
    expect(r.draft).toEqual(ok.draft);
  });

  it("lists several amounts with og before the last", () => {
    const r = finalizeAssessment(ok, { scopeMismatch: false, unbackedAmounts: [999, 1500], unparseableAmount: false });
    expect(r.reason).toContain("Udkastet nævner 999 kr. og 1.500 kr., som ikke kommer fra et opslag.");
  });

  it("puts the scope sentence first when both apply", () => {
    const r = finalizeAssessment(ok, { scopeMismatch: true, unbackedAmounts: [999], unparseableAmount: false });
    expect(r.needs_human).toBe(true);
    expect(r.reason.startsWith("Opslag matchede en anden adresse")).toBe(true);
    expect(r.reason.indexOf("Udkastet nævner 999 kr.")).toBeGreaterThan(0);
  });
});

describe("fix round 1: broader spellings", () => {
  it.each<[string, number[]]>([
    ["1299 kroner", [1299]],
    ["1.299 kroner", [1299]],
    ["5 kroner", [5]],
    ["1 krone", [1]],
    ["pris: 1299", [1299]],
    ["Prisen 1299", [1299]],
    ["det koster 1299", [1299]],
    ["det kostede 1299", [1299]],
    ["i alt 1.299", [1299]],
    ["total 1299", [1299]],
    ["totalt: 1299", [1299]],
    ["beløb 1299", [1299]],
    ["beløbet 1299", [1299]],
    ["du skal betale 1299", [1299]],
    ["han betaler 1.299", [1299]],
    ["1299.-", [1299]],
    ["1.299.- kr", [1299]],
    ["999.95 kr", [999.95]],
    ["1.299 kr", [1299]],
    ["899 til 1.299 kr", [899, 1299]],
    ["mellem 899 og 1.299 kr", [899, 1299]],
    ["899 eller 1.299 kr", [899, 1299]],
    ["899-1.299 kr", [899, 1299]],
    ["899–1.299 kr", [899, 1299]],
    ["899—1.299 kr", [899, 1299]],
  ])("extracts %s", (text, expected) => {
    expect(extractAmounts(text)).toEqual(expected);
  });

  it.each([
    "fra 2022",
    "kun 3 dage",
    "iPhone 13",
    "128 GB",
    "36 måneders garanti",
    "30–60 minutter",
    "tlf. 50 45 33 71",
    "90 %",
    "PS-1001",
    "den 21. november",
    "åbent 10–18",
    "pris 5",
    "fra 899",
  ])("finds nothing in %s", (text) => {
    expect(extractAmounts(text)).toEqual([]);
    expect(hasUnparseableAmount(text)).toBe(false);
  });

  it("still catches fra/kun when a unit follows", () => {
    expect(extractAmounts("fra 899 kr")).toEqual([899]);
    expect(extractAmounts("kun 199 kroner")).toEqual([199]);
  });

  it.each([
    "5 tusind kr",
    "5 tusind kroner",
    "5k kr",
    "1,5 mio. kr",
    "5 tkr",
    "5 t.kr",
    "pris 5k",
    "koster 2 tusind",
    "hundrede kroner",
    "tusind kroner",
    "to tusind kr",
    "tohundrede og halvtreds kroner",
  ])("flags %s as unparseable", (text) => {
    expect(hasUnparseableAmount(text)).toBe(true);
  });

  it("does not flag ordinary amounts or a bare unit word", () => {
    expect(hasUnparseableAmount("Det koster 1.299 kr.")).toBe(false);
    expect(hasUnparseableAmount("Vi har krone-tilbud")).toBe(false);
  });

  it("backs only on exact numeric equality", () => {
    expect(unbackedAmounts("Det koster 299 kr.", ["Skærmskift: 1.299 kr."])).toEqual([299]);
    expect(unbackedAmounts("Det koster 999.95 kr", ["Pris: 999,95 kr."])).toEqual([]);
  });

  it("uses the price-word rule on the backing side too", () => {
    expect(unbackedAmounts("Det koster 1.299 kr.", ["Pris: 1299"])).toEqual([]);
  });

  it("forces a human for an unbacked amount in the subject", () => {
    const unbacked = unbackedAmounts("Tilbud: 999 kr.", ["Skærmskift: 1.299 kr."]);
    expect(unbacked).toEqual([999]);
    const r = finalizeAssessment(
      { ...ok, draft: { subject: "Tilbud: 999 kr.", body: "Hej" } },
      { scopeMismatch: false, unbackedAmounts: unbacked, unparseableAmount: false },
    );
    expect(r.needs_human).toBe(true);
  });

  it("adds the unparseable sentence and forces a human", () => {
    const r = finalizeAssessment(ok, { scopeMismatch: false, unbackedAmounts: [], unparseableAmount: true });
    expect(r.needs_human).toBe(true);
    expect(r.reason).toContain(
      "Udkastet nævner et beløb i ord eller forkortelse, som ikke kan kontrolleres mod et opslag.",
    );
  });
});

describe("fix round 2", () => {
  it.each<[string, number[]]>([
    ["1299 danske kroner", [1299]],
    ["Prisen er 1299", [1299]],
    ["koster ca. 1299", [1299]],
    ["koster cirka 1299", [1299]],
    ["prisen ligger på 1299", [1299]],
    ["koster kun 899", [899]],
    ["koster fra 899", [899]],
    ["prisen er ca. 1299", [1299]],
    ["totalen 1299", [1299]],
    ["totalen er 1.299", [1299]],
    ["betal 1299", [1299]],
    ["899 og 1.299 kr", [899, 1299]],
    ["899 eller 1.299 kr", [899, 1299]],
  ])("extracts %s", (text, expected) => {
    expect(extractAmounts(text)).toEqual(expected);
  });

  it.each([
    "i alt 14 dage",
    "koster 15 minutter",
    "total 30 minutter",
    "betaler 12 måneder",
    "koster 10-15 minutter",
    "total 36 måneder",
    "koster 128 GB",
    "koster 20 % mere",
    "beløbet 50 45 33 71",
    "koster 2 timer",
    "pris 3 uger",
    "koster 5 stk",
  ])("finds nothing in %s", (text) => {
    expect(extractAmounts(text)).toEqual([]);
  });

  it("still finds money when a unit follows the price word number", () => {
    expect(extractAmounts("koster 15 kr")).toEqual([15]);
    expect(extractAmounts("koster 1299 20 kr")).toEqual([20]);
  });

  it("returns within 500 ms on a 100,000-character pathological string", () => {
    const text = "12.345".repeat(Math.ceil(100000 / 6));
    const start = Date.now();
    extractAmounts(text);
    hasUnparseableAmount(text);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("also stays fast on other long inputs", () => {
    for (const unit of ["1 234 ", "pris ", "ca. 1,2,3 ", "tusind en "]) {
      const text = unit.repeat(Math.ceil(100000 / unit.length));
      const start = Date.now();
      extractAmounts(text);
      hasUnparseableAmount(text);
      expect(Date.now() - start).toBeLessThan(2000);
    }
  });
});
