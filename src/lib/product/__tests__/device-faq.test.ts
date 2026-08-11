import { describe, it, expect } from "vitest";
import { getDeviceFaq, getAccessoryFaq } from "../device-faq";

describe("getAccessoryFaq", () => {
  const faq = getAccessoryFaq("Apple Smart Folio iPad Air 11 Denim");
  const allText = faq.map((f) => `${f.q} ${f.a}`).join(" ");

  it("never claims the 36-month device warranty", () => {
    expect(allText).not.toMatch(/36 måneder/i);
  });

  it("never mentions a cosmetic grade", () => {
    expect(allText).not.toMatch(/grade/i);
  });

  it("never mentions battery/battery health", () => {
    expect(allText).not.toMatch(/batteri/i);
  });

  it("never claims the 30+ quality tests device pitch", () => {
    expect(allText).not.toMatch(/30\+/);
    expect(allText).not.toMatch(/kvalitetstest/i);
  });

  it("mentions statutory 2-year reklamationsret", () => {
    expect(allText).toMatch(/2 år/);
    expect(allText).toMatch(/reklamationsret/i);
  });

  it("mentions the 14-day fortrydelsesret", () => {
    expect(allText).toMatch(/14 dage/i);
  });

  it("mentions free shipping at the real threshold (500 kr)", () => {
    expect(allText).toMatch(/500 kr/);
  });

  it("returns 3-4 questions", () => {
    expect(faq.length).toBeGreaterThanOrEqual(3);
    expect(faq.length).toBeLessThanOrEqual(4);
  });
});

describe("getDeviceFaq — unchanged for real devices", () => {
  it("still carries the device-specific claims (grade, warranty, battery)", () => {
    const faq = getDeviceFaq("Apple MacBook Air 15 M4");
    const allText = faq.map((f) => `${f.q} ${f.a}`).join(" ");
    expect(allText).toMatch(/36 måneder/i);
    expect(allText).toMatch(/Grade/);
    expect(allText).toMatch(/batteri/i);
    expect(faq.length).toBe(9);
  });
});
