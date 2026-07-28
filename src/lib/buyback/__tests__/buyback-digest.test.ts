import { describe, it, expect } from "vitest";
import { buildDigestHtml, buildDigestSubject, type DigestData } from "@/lib/email/buyback-digest";

const empty: DigestData = {
  toPay: [],
  toReceive: [],
  waiting: { total: 0, oldestDays: 0, biggest: [] },
  yesterday: { sent: 0, accepted: 0, rejected: 0, acceptRatePct: null },
  problems: [],
};

describe("buildDigestHtml", () => {
  it("puts payouts first, with reg and account number", () => {
    const html = buildDigestHtml({
      ...empty,
      toPay: [
        {
          sellerName: "Mette Hansen",
          bankReg: "1234",
          bankAccount: "5678901234",
          amountKr: 1800,
          receiptNumber: "PS-001",
        },
      ],
      waiting: { total: 2, oldestDays: 3, biggest: [] },
    });
    expect(html).toContain("Mette Hansen");
    expect(html).toContain("1234");
    expect(html).toContain("5678901234");
    expect(html.indexOf("Skal betales")).toBeLessThan(html.indexOf("Venter på dig"));
  });

  it("totals the payouts", () => {
    const html = buildDigestHtml({
      ...empty,
      toPay: [
        { sellerName: "A", bankReg: "1", bankAccount: "2", amountKr: 1500, receiptNumber: "PS-1" },
        { sellerName: "B", bankReg: "3", bankAccount: "4", amountKr: 500, receiptNumber: "PS-2" },
      ],
    });
    expect(html).toContain("2.000 kr");
  });

  it("lists devices in transit with their age", () => {
    const html = buildDigestHtml({
      ...empty,
      toReceive: [{ customerName: "Jens", deviceLabel: "Apple iPhone 12", daysInTransit: 4 }],
    });
    expect(html).toContain("Apple iPhone 12");
    expect(html).toContain("4 dage");
  });

  it("names why each waiting lead is waiting", () => {
    const html = buildDigestHtml({
      ...empty,
      waiting: {
        total: 1,
        oldestDays: 2,
        biggest: [{ label: "Apple iPhone 15", reason: "Bud over loftet" }],
      },
    });
    expect(html).toContain("Apple iPhone 15");
    expect(html).toContain("Bud over loftet");
  });

  it("says so plainly when there is nothing to do", () => {
    expect(buildDigestHtml(empty)).toContain("Intet at gøre");
  });

  it("shows problems when there are any", () => {
    const html = buildDigestHtml({
      ...empty,
      problems: [{ summary: "Tilbudsmail bouncede", severity: "critical" }],
    });
    expect(html).toContain("Tilbudsmail bouncede");
  });

  it("uses no emojis", () => {
    expect(/\p{Extended_Pictographic}/u.test(buildDigestHtml(empty))).toBe(false);
  });
});

describe("buildDigestSubject", () => {
  it("leads with what needs doing", () => {
    const subject = buildDigestSubject({
      ...empty,
      toPay: [{ sellerName: "A", bankReg: "1", bankAccount: "2", amountKr: 100, receiptNumber: "PS-1" }],
      waiting: { total: 3, oldestDays: 1, biggest: [] },
    });
    expect(subject).toContain("1 skal betales");
    expect(subject).toContain("3 venter");
  });

  it("says nothing to do on a quiet day", () => {
    expect(buildDigestSubject(empty)).toContain("intet at gøre");
  });
});
