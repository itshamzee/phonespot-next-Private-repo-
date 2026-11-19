import { describe, it, expect } from "vitest";
import { extractAmounts, unbackedAmounts, formatKroner } from "@/lib/mail-agent/amount-filter";
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
    const r = finalizeAssessment(ok, { scopeMismatch: false, unbackedAmounts: [999] });
    expect(r.needs_human).toBe(true);
    expect(r.reason.startsWith("Udkastet nævner 999 kr., som ikke kommer fra et opslag.")).toBe(true);
    expect(r.draft).toEqual(ok.draft);
  });

  it("lists several amounts with og before the last", () => {
    const r = finalizeAssessment(ok, { scopeMismatch: false, unbackedAmounts: [999, 1500] });
    expect(r.reason).toContain("Udkastet nævner 999 kr. og 1.500 kr., som ikke kommer fra et opslag.");
  });

  it("puts the scope sentence first when both apply", () => {
    const r = finalizeAssessment(ok, { scopeMismatch: true, unbackedAmounts: [999] });
    expect(r.needs_human).toBe(true);
    expect(r.reason.startsWith("Opslag matchede en anden adresse")).toBe(true);
    expect(r.reason.indexOf("Udkastet nævner 999 kr.")).toBeGreaterThan(0);
  });
});
