import { describe, it, expect } from "vitest";
import { verifiedEmailsFor } from "@/lib/mail-agent/agent";

describe("verifiedEmailsFor", () => {
  it("trims and lower-cases for email and form", () => {
    expect(verifiedEmailsFor("email", "  Anna@Gmail.COM ")).toEqual(["anna@gmail.com"]);
    expect(verifiedEmailsFor("form", "Anna@Gmail.com")).toEqual(["anna@gmail.com"]);
  });

  it("returns nothing for null, empty and whitespace", () => {
    expect(verifiedEmailsFor("email", null)).toEqual([]);
    expect(verifiedEmailsFor("email", "")).toEqual([]);
    expect(verifiedEmailsFor("form", "   ")).toEqual([]);
  });

  it("verifies no address on other channels", () => {
    for (const ch of ["sms", "messenger", "google_review", "trustpilot_review"] as const) {
      expect(verifiedEmailsFor(ch, "anna@gmail.com")).toEqual([]);
    }
  });
});
