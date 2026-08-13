import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Pins the fact confirmed by the owner 2026-08: every Grade A device ships
 * with a NEW BATTERY fitted, so it shows 100% capacity — across phones,
 * laptops, iPads and Apple Watch. Grade A copy must state that a new
 * battery is fitted and that capacity is 100%, and must never again say
 * "min. 85%" (the old, hedged claim this replaced).
 *
 * Grade B (min. 80%) and Grade C (min. 75%) are intentionally untouched —
 * do not "fix" those numbers here without a matching product/business
 * decision; see commit "feat: Grade A ships with a new battery at 100%
 * capacity" for the full inventory of what was and wasn't changed.
 */

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

describe("Grade A battery fact — new battery, 100% capacity", () => {
  it("condition-explainer.tsx states a new battery + 100% for every device type's Grade A, never min. 85%", () => {
    const src = read("src/components/product/condition-explainer.tsx");
    const aBlocks = [
      ...src.matchAll(/grade:\s*"A"[\s\S]*?bullets:\s*\[([\s\S]*?)\],/g),
    ].map((m) => m[1]);

    // PHONE_GRADES, WATCH_GRADES, IPAD_GRADES, LAPTOP_GRADES each have an "A" entry.
    expect(aBlocks.length).toBe(4);
    for (const block of aBlocks) {
      expect(block).toMatch(/nyt batteri/i);
      expect(block).toMatch(/100%/);
      expect(block).not.toMatch(/min\.\s?85%/i);
    }
  });

  it("device-detail.tsx GRADE_DETAILS.A states a new battery + 100%, not min. 85%, and reads differently from Grade N", () => {
    const src = read("src/components/product/device-detail.tsx");
    const nMatch = src.match(/N:\s*\{[^}]*battery:\s*"([^"]+)"/);
    const aMatch = src.match(/A:\s*\{[^}]*battery:\s*"([^"]+)"/);

    expect(aMatch).not.toBeNull();
    expect(nMatch).not.toBeNull();

    const aBattery = aMatch![1];
    const nBattery = nMatch![1];

    expect(aBattery).toMatch(/nyt batteri/i);
    expect(aBattery).toMatch(/100%/);
    expect(aBattery).not.toMatch(/85%/);

    // Grade N (factory-new, unused) and Grade A (used device, new battery
    // fitted) are both 100% capacity but must not read as the same claim —
    // a customer comparing them must be able to tell them apart.
    expect(aBattery).not.toBe(nBattery);
  });

  it("grade-selector.tsx tooltip for Grade A mentions the new battery and 100% capacity", () => {
    const src = read("src/components/product/grade-selector.tsx");
    const match = src.match(/A:\s*\{[\s\S]*?tooltip:\s*\n?\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/nyt batteri/i);
    expect(match![1]).toMatch(/100%/);
  });

  it("device-faq.ts Grade A/B/C answer credits Grade A with a new battery at 100%, not min. 85%", () => {
    const src = read("src/lib/product/device-faq.ts");
    const match = src.match(
      /Hvad er forskellen mellem Grade A, B og C\?[\s\S]*?a:\s*"([^"]+)"/,
    );
    expect(match).not.toBeNull();
    const answer = match![1];
    expect(answer).toMatch(/nyt batteri/i);
    expect(answer).toMatch(/100%/);
    expect(answer).not.toMatch(/A min\.\s?85%/i);
    // B and C are unchanged.
    expect(answer).toMatch(/min\.\s?80%/i);
    expect(answer).toMatch(/min\.\s?75%/i);
  });

  it("kvalitet page's BATTERY_GRADES table gives Grade A 100% capacity via a new battery", () => {
    const src = read("src/app/kvalitet/page.tsx");
    const match = src.match(
      /grade:\s*"Grade A"[\s\S]*?detail:\s*"([^"]+)"/,
    );
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/nyt batteri/i);
    expect(match![1]).toMatch(/100%/);
  });

  it("kvalitet page FAQ/JSON-LD copy about Grade A no longer states min. 85%", () => {
    const src = read("src/app/kvalitet/page.tsx");
    expect(src).not.toMatch(/minimum 85% kapacitet/i);
    expect(src).not.toMatch(/min\.\s?85%/i);
  });

  it("category FAQ pages (iPhones/iPads/Smartphones/Smartwatches) credit Grade A with a new battery at 100%, not min. 85%", () => {
    const files = [
      "src/app/iphones/page.tsx",
      "src/app/ipads/page.tsx",
      "src/app/smartphones/page.tsx",
      "src/app/smartwatches/page.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(/Grade A kræver min\.\s?85%/);
      expect(src).toMatch(/nyt batteri/i);
      // Grade B/C thresholds must still be present and unchanged.
      expect(src).toMatch(/min\.\s?80%/i);
      expect(src).toMatch(/min\.\s?75%/i);
    }
  });

  it("handelsbetingelser (terms) Grade A clause states 100% via a new battery, not minimum 85 %", () => {
    const src = read("src/app/handelsbetingelser/page.tsx");
    expect(src).not.toMatch(/Batterisundhed minimum 85\s?%/);
    const match = src.match(/Grad A[\s\S]*?<\/li>/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/nyt batteri/i);
    expect(match![0]).toMatch(/100\s?%/);
  });

  it("model-pages.ts iPhone 14 Pro FAQ credits Grade A with a new battery at 100%, not minimum 85%", () => {
    const src = read("src/lib/model-pages.ts");
    expect(src).not.toMatch(/Grade A enheder har minimum 85%/);
    expect(src).toMatch(/Grade A enheder får altid isat et nyt batteri/i);
  });
});
