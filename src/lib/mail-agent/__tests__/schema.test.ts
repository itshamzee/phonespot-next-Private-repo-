import { describe, it, expect } from "vitest";
import { assessmentSchema, handlingFor, finalizeAssessment } from "@/lib/mail-agent/schema";
import type { Assessment } from "@/lib/mail-agent/types";

const ok: Assessment = {
  category: "ordre",
  needs_human: false,
  reason: "Ordre fundet",
  summary: "Spørger til levering",
  confidence: 0.9,
  draft: { subject: "Re: Min ordre", body: "Hej" },
};

describe("assessmentSchema", () => {
  it("accepts a valid assessment", () => {
    expect(assessmentSchema.parse(ok)).toEqual(ok);
  });

  it("rejects unknown category and out-of-range confidence", () => {
    expect(() => assessmentSchema.parse({ ...ok, category: "x" })).toThrow();
    expect(() => assessmentSchema.parse({ ...ok, confidence: 1.4 })).toThrow();
  });

  it("accepts a null draft", () => {
    expect(assessmentSchema.parse({ ...ok, draft: null }).draft).toBeNull();
  });
});

describe("handlingFor", () => {
  it("does not create inquiries for spam or system mail", () => {
    expect(handlingFor("nyhedsbrev_spam")).toEqual({ createInquiry: false, draft: false, forceHuman: false });
    expect(handlingFor("system_notifikation").createInquiry).toBe(false);
  });

  it("forces a human for complaints and suppliers", () => {
    expect(handlingFor("retur_reklamation")).toEqual({ createInquiry: true, draft: true, forceHuman: true });
    expect(handlingFor("leverandoer_b2b")).toEqual({ createInquiry: true, draft: false, forceHuman: true });
  });
});

describe("finalizeAssessment", () => {
  it("sets needs_human on forced categories and on scope mismatch", () => {
    expect(finalizeAssessment({ ...ok, category: "retur_reklamation" }, { scopeMismatch: false }).needs_human).toBe(true);
    const m = finalizeAssessment(ok, { scopeMismatch: true });
    expect(m.needs_human).toBe(true);
    expect(m.reason).toContain("anden adresse");
  });

  it("leaves a clean order assessment alone", () => {
    expect(finalizeAssessment(ok, { scopeMismatch: false })).toEqual(ok);
  });

  it("drops the draft for categories that never draft", () => {
    expect(finalizeAssessment({ ...ok, category: "leverandoer_b2b" }, { scopeMismatch: false }).draft).toBeNull();
  });
});
