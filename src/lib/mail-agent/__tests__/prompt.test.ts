import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/mail-agent/prompt";

describe("buildSystemPrompt", () => {
  const text = buildSystemPrompt({ mailbox: "info@phonespot.dk", displayName: "PhoneSpot" });

  it("names the price and diagnosis tools", () => {
    for (const name of ["quote_repair", "diagnose", "quote_buyback"]) {
      expect(text).toContain(name);
    }
  });

  it("states the amount rules verbatim", () => {
    expect(text).toContain("Nævn kun et beløb, som et værktøj har returneret i denne samtale.");
    expect(text).toContain("Opkøbspriser er altid vejledende.");
  });

  it("tells the model what to do with candidates and technical failures", () => {
    expect(text).toContain("Flere modeller passer");
    expect(text).toContain("Mente du");
    expect(text).toContain("fejlede teknisk");
  });

  it("has a technical questions section with safety advice", () => {
    expect(text).toContain("Tekniske spørgsmål");
    expect(text).toContain("slukke enheden");
  });

  it("keeps the security section", () => {
    expect(text).toContain("Sikkerhed");
  });

  it("is free of per-request values", () => {
    expect(text).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
  });
});
