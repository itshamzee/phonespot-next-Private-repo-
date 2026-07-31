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

  it("offer email escapes device labels in the per-device line table", () => {
    const html = buildOfferEmailHtml({
      customerName: "Mette",
      deviceType: "Telefon",
      brand: "Apple",
      model: "iPhone 12",
      storage: "128GB",
      conditionSummary: "God",
      offerAmountKr: "2.700,00 kr.",
      acceptUrl: "https://phonespot.dk/a",
      rejectUrl: "https://phonespot.dk/r",
      lines: {
        included: [
          { label: "Apple iPhone 12 128GB", amountKr: "1.800,00 kr." },
          // modelCustom is free text from the wizard — it reaches the label raw.
          { label: nasty, amountKr: "900,00 kr." },
        ],
        excluded: [{ label: nasty, reasonBody: nasty }],
      },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Apple iPhone 12 128GB");
    expect(html).toContain("1.800,00 kr.");
  });

  it("offer email keeps the single-device layout when nothing is excluded", () => {
    const html = buildOfferEmailHtml({
      customerName: "Mette",
      deviceType: "Telefon",
      brand: "Apple",
      model: "iPhone 12",
      storage: "128GB",
      conditionSummary: "God",
      offerAmountKr: "1.800,00 kr.",
      acceptUrl: "https://phonespot.dk/a",
      rejectUrl: "https://phonespot.dk/r",
      lines: {
        included: [{ label: "Apple iPhone 12 128GB", amountKr: "1.800,00 kr." }],
        excluded: [],
      },
    });
    expect(html).toContain("Stand:");
    expect(html).not.toContain("Dine enheder");
  });

  it("digest escapes seller names and event summaries", () => {
    const data: DigestData = {
      toPay: [
        { sellerName: nasty, bankReg: "1234", bankAccount: "5678", amountKr: 100, receiptNumber: "PS-1" },
      ],
      toReceive: [{ customerName: nasty, deviceLabel: nasty, daysInTransit: 1 }],
      stuck: [{ deviceLabel: nasty, customerName: nasty, trackingNumber: nasty, days: 3, reason: "leveret_ikke_modtaget" as const }],
      waiting: { total: 1, oldestDays: 1, biggest: [{ label: nasty, reason: nasty }] },
      yesterday: { sent: 1, accepted: 0, rejected: 0, acceptRatePct: null },
      problems: [{ summary: nasty, severity: "critical" }],
    };
    const html = buildDigestHtml(data);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
