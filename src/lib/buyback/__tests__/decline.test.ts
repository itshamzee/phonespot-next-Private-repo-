import { describe, it, expect } from "vitest";
import { DECLINE_REASONS, declineReason, isDeclineReasonCode } from "../decline-reasons";
import { buildDeclineEmailHtml, buildDeclineEmailSubject } from "@/lib/email/decline-email";

describe("decline reasons", () => {
  it("covers the six agreed codes", () => {
    expect(DECLINE_REASONS.map((r) => r.code)).toEqual([
      "ikke_koeb_stand", "vandskade", "skaerm_knust", "icloud_laast", "for_gammel_model", "mangler_info",
    ]);
  });

  it("gives every reason a Danish label and a real explanation", () => {
    for (const reason of DECLINE_REASONS) {
      expect(reason.label.length).toBeGreaterThan(0);
      expect(reason.body.length).toBeGreaterThan(20);
    }
  });

  it("never mentions internal suppliers in customer-facing text", () => {
    for (const reason of DECLINE_REASONS) {
      expect(reason.body.toLowerCase()).not.toContain("foneday");
      expect(reason.body.toLowerCase()).not.toContain("foxway");
      expect(reason.body.toLowerCase()).not.toContain("panserglas");
    }
  });

  it("recognises valid codes and rejects everything else", () => {
    expect(isDeclineReasonCode("vandskade")).toBe(true);
    expect(isDeclineReasonCode("noget_andet")).toBe(false);
    expect(isDeclineReasonCode(null)).toBe(false);
    expect(isDeclineReasonCode(42)).toBe(false);
  });

  it("looks up a reason by code", () => {
    expect(declineReason("icloud_laast").label).toMatch(/icloud/i);
  });
});

describe("decline email", () => {
  const base = { customerName: "Mette", deviceLabel: "Apple iPhone 12 128GB", reasonCode: "vandskade" as const };

  it("greets the customer by name", () => {
    expect(buildDeclineEmailHtml(base)).toContain("Mette");
  });

  it("names the device", () => {
    expect(buildDeclineEmailHtml(base)).toContain("Apple iPhone 12 128GB");
  });

  it("carries the reason paragraph", () => {
    expect(buildDeclineEmailHtml(base)).toContain("vandskade");
  });

  it("contains no accept or reject links", () => {
    const html = buildDeclineEmailHtml(base);
    expect(html).not.toContain("/accepter");
    expect(html).not.toContain("/afvis");
    expect(html).not.toContain("token=");
  });

  it("names the device in the subject", () => {
    expect(buildDeclineEmailSubject("Apple iPhone 12 128GB")).toContain("iPhone 12");
  });

  it("uses no emojis", () => {
    expect(/\p{Extended_Pictographic}/u.test(buildDeclineEmailHtml(base))).toBe(false);
  });

  it("renders every reason without throwing", () => {
    for (const reason of DECLINE_REASONS) {
      expect(buildDeclineEmailHtml({ ...base, reasonCode: reason.code })).toContain("PhoneSpot");
    }
  });
});
