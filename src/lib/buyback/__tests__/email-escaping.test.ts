import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/email/escape";
import { buildDeclineEmailHtml } from "@/lib/email/decline-email";
import { buildOfferEmailHtml } from "@/lib/email/offer-email";
import { buildDigestHtml, type DigestData } from "@/lib/email/buyback-digest";

const nasty = '<script>alert("x")</script>';

describe("escapeHtml", () => {
  it("neutralises tags and quotes", () => {
    expect(escapeHtml(nasty)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("escapes ampersands first so entities are not double-broken", () => {
    expect(escapeHtml("Fisk & Co <b>")).toBe("Fisk &amp; Co &lt;b&gt;");
  });

  it("handles null and undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("customer-supplied values never reach the markup raw", () => {
  it("decline email escapes the customer name and device", () => {
    const html = buildDeclineEmailHtml({
      customerName: nasty,
      deviceLabel: nasty,
      reasonCode: "vandskade",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("offer email escapes the customer name, device and condition", () => {
    const html = buildOfferEmailHtml({
      customerName: nasty,
      deviceType: "Telefon",
      brand: nasty,
      model: nasty,
      storage: nasty,
      conditionSummary: nasty,
      offerAmountKr: "1.450,00 kr.",
      acceptUrl: "https://phonespot.dk/a",
      rejectUrl: "https://phonespot.dk/r",
    });
    expect(html).not.toContain("<script>");
  });

  it("digest escapes seller names and event summaries", () => {
    const data: DigestData = {
      toPay: [
        { sellerName: nasty, bankReg: "1234", bankAccount: "5678", amountKr: 100, receiptNumber: "PS-1" },
      ],
      toReceive: [{ customerName: nasty, deviceLabel: nasty, daysInTransit: 1 }],
      waiting: { total: 1, oldestDays: 1, biggest: [{ label: nasty, reason: nasty }] },
      yesterday: { sent: 1, accepted: 0, rejected: 0, acceptRatePct: null },
      problems: [{ summary: nasty, severity: "critical" }],
    };
    const html = buildDigestHtml(data);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
