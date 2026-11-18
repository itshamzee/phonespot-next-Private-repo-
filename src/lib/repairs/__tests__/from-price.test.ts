import { describe, expect, it } from "vitest";
import { countsTowardFromPrice } from "../from-price";

describe("countsTowardFromPrice", () => {
  it("skips diagnostics and free services", () => {
    expect(countsTowardFromPrice({ price_dkk: 248, service_category: "Diagnostik" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 249, name: "Diagnose" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 0, service_category: "Skærmskift" })).toBe(false);
  });

  it("counts real repairs", () => {
    expect(countsTowardFromPrice({ price_dkk: 399, service_category: "Højttaler" })).toBe(true);
    expect(countsTowardFromPrice({ price_dkk: 699, service_category: "Vibrator", name: "Vibrator", slug: "vibrator" })).toBe(true);
    expect(countsTowardFromPrice({ price_dkk: 899, name: "Rens + ny kølepasta", slug: "rens-koelepasta" })).toBe(true);
    expect(countsTowardFromPrice({ price_dkk: 1199, service_category: "Vandskade", name: "Vandskade" })).toBe(true);
  });

  it("skips software, free checks and other non-hardware services", () => {
    expect(countsTowardFromPrice({ price_dkk: 499, service_category: "Software", name: "Software-fejl", slug: "software-fejl" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 299, name: "Fejlsøgning" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 99, name: "Hurtigt tjek" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 199, slug: "software-opdatering" })).toBe(false);
  });

  it("gives iPhone 15 a from-price from a real repair, not software or diagnostics", () => {
    // Prislisten for iPhone 15 pr. november 2026 (udsnit).
    const services = [
      { name: "Diagnostik", slug: "diagnostik", service_category: "Diagnostik", price_dkk: 249 },
      { name: "Software-fejl", slug: "software-fejl", service_category: "Software", price_dkk: 499 },
      { name: "Vibrator", slug: "vibrator", service_category: "Vibrator", price_dkk: 699 },
      { name: "Batteriskift (Højkapacitet)", slug: "batteriskift", service_category: "Batteriskift", price_dkk: 899 },
      { name: "Skærmskift (Budget)", slug: "skaermskift-budget", service_category: "Skærmskift", price_dkk: 1599 },
    ];
    const from = Math.min(...services.filter(countsTowardFromPrice).map((s) => s.price_dkk));
    expect(from).toBe(699);
  });
});
