import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

/**
 * The tests above only grep source strings — they cannot catch the failure
 * mode that actually blocked the pre-push review in 2026-08: the COPY
 * promising "new battery, 100%" was correct, but live Grade A stock in the
 * `devices` table had a recorded battery_health below 100, so the product
 * page contradicted itself against real inventory. Source-string checks are
 * blind to that; only checking the data can catch it.
 *
 * This suite queries `devices` directly (service-role, read-only) for every
 * `status = 'listed'` unit and asserts its recorded battery_health does not
 * contradict what its grade tells the customer:
 *   - Grade N/P/A: new battery fitted — must be exactly 100% when recorded.
 *   - Grade B: floor is min. 80%.
 *   - Grade C: floor is min. 75%.
 * A unit with battery_health = null is not a contradiction (nothing is
 * claimed about a value nobody recorded) — but a unit with a *known* value
 * outside its grade's promise is exactly the bug this test exists to catch.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (read from .env.local, same as the
 * scripts/ diagnostics). When credentials aren't available — e.g. a CI
 * runner without secrets — the suite skips loudly (a visible console
 * warning + a skipped test, never a silent pass) rather than failing the
 * whole run on an environment it can't check.
 */
describe("Grade battery fact vs. live inventory — devices.battery_health must not contradict devices.grade", () => {
  const repoRootForEnv = path.resolve(__dirname, "..", "..");
  const envPath = path.join(repoRootForEnv, ".env.local");

  function loadEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    if (!existsSync(envPath)) return env;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      env[t.slice(0, i)] = t.slice(i + 1);
    }
    return env;
  }

  const env = loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  const hasCredentials = Boolean(url && serviceKey);

  if (!hasCredentials) {
    // eslint-disable-next-line no-console
    console.warn(
      "[grade-a-battery.test.ts] SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not " +
        "available — skipping the live devices.battery_health-vs-grade check. This test " +
        "cannot protect against a contradiction slipping into production inventory unless " +
        "it runs somewhere with these credentials.",
    );
  }

  const BATTERY_PROMISE: Record<string, { exact?: number; min?: number }> = {
    N: { exact: 100 },
    P: { exact: 100 },
    A: { exact: 100 },
    B: { min: 80 },
    C: { min: 75 },
  };

  it.skipIf(!hasCredentials)(
    "every listed device's recorded battery_health matches its grade's promise",
    async () => {
      const supabase = createClient(url!, serviceKey!);
      const { data: devices, error } = await supabase
        .from("devices")
        .select("id, template_id, grade, battery_health, status")
        .eq("status", "listed")
        .not("battery_health", "is", null);

      expect(error).toBeNull();
      expect(devices).not.toBeNull();

      const violations: string[] = [];
      for (const d of devices ?? []) {
        const promise = BATTERY_PROMISE[d.grade as string];
        if (!promise) continue; // Unknown/legacy grade code — not this test's concern.
        const bh = d.battery_health as number;
        if (promise.exact != null && bh !== promise.exact) {
          violations.push(
            `device ${d.id} (template ${d.template_id}): grade ${d.grade} promises exactly ` +
              `${promise.exact}% but battery_health is ${bh}%`,
          );
        }
        if (promise.min != null && bh < promise.min) {
          violations.push(
            `device ${d.id} (template ${d.template_id}): grade ${d.grade} promises min. ` +
              `${promise.min}% but battery_health is ${bh}%`,
          );
        }
      }

      expect(violations, violations.join("\n")).toEqual([]);
    },
  );
});
