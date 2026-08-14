import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Owner decision 2026-08 (third time this contradiction recurred): grade is
 * a COSMETIC classification and must never carry a battery promise. Battery
 * health is a per-unit measurement (devices.battery_health) that only ever
 * describes the individual device a customer is looking at — it cannot be
 * predicted from a grade letter, and grade copy that tries to (e.g. "Grade A
 * ships with a new battery, 100%") keeps colliding with real stock: two
 * Samsung watches at 85%/95%, and an HP EliteBook at 97% on a grade that
 * used to promise 100%.
 *
 * This suite pins the new model:
 *   1. No grade description anywhere in the codebase states a battery
 *      percentage or claims a new battery is fitted. Grade copy describes
 *      cosmetic condition only.
 *   2. Any battery statement shown to a customer is about ONE physical unit,
 *      sourced only from that unit's own battery_health/battery_replaced,
 *      never invented when unknown.
 *   3. Live inventory: buildBatteryLine() — the actual function the buy box
 *      renders with — never disagrees with what's recorded on the unit it's
 *      called with, checked against real production data.
 *   4. garanti/page.tsx's warranty degradation floors (A 85%, B 80%, C 75%)
 *      are a different, deliberately untouched fact — a post-sale coverage
 *      threshold, not a sale-time promise — and must keep reading that way.
 */

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

// Matches the old failure mode: "nyt batteri", or a percentage tied to the
// word "batteri"/"kapacitet" (in either order), or a "min. NN%" floor.
// Deliberately narrower than "any percent sign" so it doesn't false-positive
// on unrelated claims like "100% funktionel" or "spar 30-40%".
const BATTERY_PERCENT_CLAIM =
  /nyt batteri isat|min\.\s?\d{2,3}\s?%|\d{2,3}\s?%\s*(kapacitet|batterikapacitet)|batteri\w*[^.]{0,60}?\d{2,3}\s?%/i;

describe("Grade copy never promises a battery percentage — cosmetic only", () => {
  it("condition-explainer.tsx: no grade's bullets (any device type) mention a battery percentage or a new battery", () => {
    const src = read("src/components/product/condition-explainer.tsx");
    const blocks = [
      ...src.matchAll(/grade:\s*"[ABC]"[\s\S]*?bullets:\s*\[([\s\S]*?)\],/g),
    ].map((m) => m[1]);

    // PHONE_GRADES, WATCH_GRADES, IPAD_GRADES, LAPTOP_GRADES each have A/B/C.
    expect(blocks.length).toBe(12);
    for (const block of blocks) {
      expect(block).not.toMatch(BATTERY_PERCENT_CLAIM);
    }
  });

  it("device-detail.tsx GRADE_DETAILS carries no battery field or percentage — cosmetic description only", () => {
    const src = read("src/components/product/device-detail.tsx");
    const match = src.match(/const GRADE_DETAILS[\s\S]*?\n\};/);
    expect(match).not.toBeNull();
    const block = match![0];

    expect(block).not.toMatch(/battery:/);
    expect(block).not.toMatch(BATTERY_PERCENT_CLAIM);
    // N stays a state description ("factory-new, never used"), not a battery
    // promise — it must still exist, just without a percentage attached.
    expect(block).toMatch(/aldrig brugt/i);
  });

  it("grade-selector.tsx tooltips (all grades) never state a battery percentage or new battery", () => {
    const src = read("src/components/product/grade-selector.tsx");
    const match = src.match(/const GRADE_META[\s\S]*?\n\};/);
    expect(match).not.toBeNull();
    expect(match![0]).not.toMatch(BATTERY_PERCENT_CLAIM);
  });

  it("device-faq.ts Grade A/B/C answer describes cosmetic condition only, no battery percentage", () => {
    const src = read("src/lib/product/device-faq.ts");
    const match = src.match(
      /Hvad er forskellen mellem Grade A, B og C\?[\s\S]*?a:\s*"([^"]+)"/,
    );
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(BATTERY_PERCENT_CLAIM);
  });

  it("kvalitet page (FAQ, JSON-LD, battery section, test-process copy) makes no grade-tied battery percentage claim", () => {
    const src = read("src/app/kvalitet/page.tsx");
    expect(src).not.toMatch(BATTERY_PERCENT_CLAIM);
  });

  it("category FAQ pages (iPhones/iPads/Smartphones/Smartwatches) make no grade-tied battery percentage claim", () => {
    // Narrower than BATTERY_PERCENT_CLAIM: these pages' comparison tables
    // legitimately state "100% kapacitet" for a brand-NEW device (an
    // objective, ungraded fact) — that's not the claim this test guards
    // against, so a bare "NN% kapacitet" alone must not trip it.
    const gradeTiedClaim = /nyt batteri|min\.\s?\d{2,3}\s?%|Grade [ABC][^.]{0,80}?\d{2,3}\s?%\s*(kapacitet|batteri)/i;
    const files = [
      "src/app/iphones/page.tsx",
      "src/app/ipads/page.tsx",
      "src/app/smartphones/page.tsx",
      "src/app/smartwatches/page.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(gradeTiedClaim);
    }
  });

  it("handelsbetingelser (terms) Grad A/B/C clauses make no grade-tied battery percentage claim", () => {
    const src = read("src/app/handelsbetingelser/page.tsx");
    const match = src.match(/3\. Produkter og kvalitetsgradering[\s\S]*?<\/ul>/);
    expect(match).not.toBeNull();
    expect(match![0]).not.toMatch(BATTERY_PERCENT_CLAIM);
  });

  it("model-pages.ts iPhone 14 Pro FAQ makes no grade-tied battery percentage claim", () => {
    const src = read("src/lib/model-pages.ts");
    expect(src).not.toMatch(/Grade A enheder får altid isat et nyt batteri/i);
    expect(src).not.toMatch(/Grade B har minimum 80%/i);
  });
});

describe("garanti/page.tsx warranty floors — left alone, and read as a post-sale threshold", () => {
  it("still states the same A 85% / B 80% / C 75% degradation floors (a different, deliberately untouched fact)", () => {
    const src = read("src/app/garanti/page.tsx");
    expect(src).toMatch(/Grade A:\s?85%/);
    expect(src).toMatch(/Grade B:\s?80%/);
    expect(src).toMatch(/Grade C:\s?75%/);
  });

  it("reads as a post-sale degradation threshold, not an at-sale promise", () => {
    const src = read("src/app/garanti/page.tsx");
    const match = src.match(/Dækker garantien batteri\?[\s\S]*?answer:\s*\n\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    const answer = match![1];
    // Must tie the floor to the warranty PERIOD/degradation, not to purchase.
    expect(answer).toMatch(/garantiperiode/i);
    // Must not claim these numbers as what the battery measures at sale —
    // that fact now lives per-unit on the product page.
    expect(answer).toMatch(/købstidspunktet/i);
  });
});

/**
 * A battery statement shown to a customer must be about ONE physical unit,
 * never a grade. `buildBatteryLine` (exported from device-detail.tsx, the
 * buy box that renders it) is the single source of that statement — these
 * are pure-function tests against synthetic units.
 */
describe("buildBatteryLine — per-unit battery statement, never invented", () => {
  // Minimal Device fixture — only battery_health/battery_replaced matter to
  // buildBatteryLine, but the full shape keeps this test resilient to
  // Device gaining more required fields later.
  function makeUnit(overrides: { battery_health: number | null; battery_replaced?: boolean | null }) {
    return {
      id: "d1",
      serial_number: null,
      imei: null,
      template_id: "t1",
      barcode: null,
      grade: "P",
      storage: null,
      color: null,
      condition_notes: null,
      photos: [],
      purchase_price: 0,
      selling_price: null,
      margin: null,
      vat_scheme: "regular",
      vat_amount: null,
      origin_country: "DK",
      supplier_id: null,
      location_id: "loc1",
      status: "listed",
      purchased_at: null,
      listed_at: null,
      sold_at: null,
      reservation_expires_at: null,
      source: "manual",
      source_sku: null,
      source_stock: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      battery_replaced: null,
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it("states nothing about the battery when battery_health is unknown — never an invented floor", async () => {
    const { buildBatteryLine } = await import("../components/product/device-detail");
    expect(buildBatteryLine(makeUnit({ battery_health: null }))).toBeNull();
    expect(buildBatteryLine(null)).toBeNull();
  });

  it("states the exact measured value for the unit, labelled as measured for that unit — the HP EliteBook case (Grade P, 97%)", async () => {
    const { buildBatteryLine } = await import("../components/product/device-detail");
    const line = buildBatteryLine(makeUnit({ battery_health: 97, battery_replaced: null }));
    expect(line).not.toBeNull();
    expect(line).toMatch(/97\s?%/);
    expect(line).toMatch(/målt på denne enhed/i);
    // No new-battery claim unless battery_replaced is explicitly true.
    expect(line).not.toMatch(/nyt batteri/i);
  });

  it("additionally states a new battery was fitted only when battery_replaced is explicitly true", async () => {
    const { buildBatteryLine } = await import("../components/product/device-detail");
    const replaced = buildBatteryLine(makeUnit({ battery_health: 100, battery_replaced: true }));
    expect(replaced).toMatch(/100\s?%/);
    expect(replaced).toMatch(/nyt batteri isat/i);

    const notReplaced = buildBatteryLine(makeUnit({ battery_health: 100, battery_replaced: false }));
    expect(notReplaced).not.toMatch(/nyt batteri/i);

    const unrecorded = buildBatteryLine(makeUnit({ battery_health: 85, battery_replaced: null }));
    expect(unrecorded).not.toMatch(/nyt batteri/i);
  });
});

/**
 * Live regression guard: the failure mode this reconciliation exists to
 * remove was copy that was internally consistent but disagreed with real
 * inventory. Since copy no longer makes any grade-level battery promise,
 * that specific contradiction can't recur — but a *new* one could, if
 * buildBatteryLine (or its future replacement) ever started reading from
 * anywhere other than the unit's own recorded fields. This runs the real
 * exported function against every currently listed device and checks the
 * output never disagrees with what's on that row.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (read from .env.local). Skips loudly
 * (console warning + skipped test, never a silent pass) when unavailable.
 */
describe("buildBatteryLine vs. live inventory — never disagrees with the unit's own recorded data", () => {
  const envPath = path.join(repoRoot, ".env.local");

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
        "available — skipping the live buildBatteryLine-vs-inventory check. This test cannot " +
        "protect against a per-unit battery statement drifting from real inventory unless it " +
        "runs somewhere with these credentials.",
    );
  }

  it.skipIf(!hasCredentials)(
    "every listed device's battery statement (if any) states exactly that device's own battery_health, and mentions a new battery only when battery_replaced is true",
    async () => {
      const { buildBatteryLine } = await import("../components/product/device-detail");
      const supabase = createClient(url!, serviceKey!);
      const { data: devices, error } = await supabase
        .from("devices")
        .select("id, template_id, grade, battery_health, battery_replaced, status")
        .eq("status", "listed");

      expect(error).toBeNull();
      expect(devices).not.toBeNull();

      const violations: string[] = [];
      for (const d of devices ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const line = buildBatteryLine(d as any);
        if (d.battery_health == null) {
          if (line !== null) {
            violations.push(
              `device ${d.id} (template ${d.template_id}): battery_health is unknown but a ` +
                `battery line was produced: "${line}"`,
            );
          }
          continue;
        }
        if (line === null || !line.includes(`${d.battery_health}%`)) {
          violations.push(
            `device ${d.id} (template ${d.template_id}): battery_health=${d.battery_health} but ` +
              `buildBatteryLine returned "${line}"`,
          );
        }
        const claimsNewBattery = line != null && /nyt batteri/i.test(line);
        if (claimsNewBattery !== (d.battery_replaced === true)) {
          violations.push(
            `device ${d.id} (template ${d.template_id}): battery_replaced=${d.battery_replaced} but ` +
              `new-battery claim in line is ${claimsNewBattery}`,
          );
        }
      }

      expect(violations, violations.join("\n")).toEqual([]);
    },
  );
});
