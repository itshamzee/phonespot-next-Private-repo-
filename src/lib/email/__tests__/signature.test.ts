import { describe, it, expect } from "vitest";
import { buildSignature, signatureText, displayPhone } from "@/lib/email/signature";

const company = { company_name: "PhoneSpot", phone: "+45 61 10 00 48", email: "info@phonespot.dk", website: "https://phonespot.dk", cvr: "38688766", trustpilot_url: "https://dk.trustpilot.com/evaluate/phonespot.dk" };

describe("buildSignature", () => {
  it("signs personally when a staff profile is bound to the mailbox", () => {
    const s = buildSignature({ mailbox: "ha@phonespot.dk", staff: { display_name: "Hamza", title: "", phone: "+45 50 45 33 71" }, company });
    expect(s).toMatchObject({ name: "Hamza", title: null, phone: "+45 50 45 33 71", email: "ha@phonespot.dk", cvr: "38688766" });
  });

  it("signs as the store for a store mailbox", () => {
    const s = buildSignature({ mailbox: "slagelse@phonespot.dk", staff: null, company });
    expect(s.name).toBe("PhoneSpot Slagelse");
    expect(s.email).toBe("slagelse@phonespot.dk");
  });

  it("signs as kundeservice otherwise", () => {
    const s = buildSignature({ mailbox: null, staff: null, company });
    expect(s.name).toBe("PhoneSpot kundeservice");
    expect(s.email).toBe("info@phonespot.dk");
    expect(s.trustpilotUrl).toContain("evaluate");
  });
});

describe("signatureText", () => {
  it("renders the plain-text twin without emojis", () => {
    const t = signatureText(buildSignature({ mailbox: "ha@phonespot.dk", staff: { display_name: "Hamza", title: "", phone: "+45 50 45 33 71" }, company }));
    expect(t).toContain("Hamza\nPHONESPOT");
    expect(t).toContain("Telefon 50 45 33 71");
    expect(t).toContain("Mail ha@phonespot.dk");
    expect(t).toContain("CVR 38688766");
    expect(t).toContain("Skriv en anmeldelse: https://dk.trustpilot.com/evaluate/phonespot.dk");
    expect(t).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe("displayPhone", () => {
  it("drops the +45 prefix", () => {
    expect(displayPhone("+45 50 45 33 71")).toBe("50 45 33 71");
    expect(displayPhone("50 45 33 71")).toBe("50 45 33 71");
  });
});
