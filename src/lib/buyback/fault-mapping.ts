// Verified against the live foneday_catalog on 2026-07-28 (15.874 rows).
//
// category  — Display (2526), Back Cover (2354), Charging Connector (1177),
//             Battery (1127), Sim reader/holder, Camera, Power/volume,
//             Integrated Circuit (IC), Speakers/loud, Camera Lens, Softcase,
//             Adhesive tapes, Hardcase, ... (~100 distinct values)
// quality   — OEM-Equivalent (9591), Service Pack (2038), Pulled A (1113),
//             Refurbished (186), Pulled B (103), Pulled C (98), In-Cell,
//             FDX ELITE/ULTRA/PRO/LITE/PRIME, Aftermarket, Soft, null
import type { BuybackCondition, FaultType } from "./types";

// Only the tiers we would actually fit to a device we resell with 36 months of
// warranty. Pulled B and Pulled C are cheaper, and deducting their price would
// mean over-paying the customer for a part we then have to buy at a better grade.
// OEM-Equivalent, In-Cell, Aftermarket and every FDX tier are aftermarket.
export const originalQualities: string[] = ["service pack", "pulled a", "refurbished"];

// Categories are matched EXACTLY, never as a substring of category + title.
// A loose substring match put adhesive tape, phone cases and camera lenses in the
// same bucket as back covers (4.714 rows matched "back"), and since the lookup
// takes the CHEAPEST hit, a broken back glass was priced at a few kroner — which
// is exactly how an automatic offer ends up far too high.
// Written with the exact casing the catalog uses, because the server-side
// filter in parts-lookup is case-sensitive. Comparisons in JS lowercase both sides.
export const faultCategories: Record<FaultType, string[]> = {
  screen: ["Display"],
  back_glass: ["Back Cover"],
  battery: ["Battery"],
  charging: ["Charging Connector"],
};

// Condition values that do NOT warrant a parts deduction (cosmetic / acceptable).
// Matched case-insensitively against the real wizard option strings in
// sell-device-wizard.tsx. Anything not listed here is treated as a fault.
const GOOD_SCREEN = new Set(["perfekt", "små ridser", "ridser"]);
const GOOD_BACK = new Set(["perfekt", "små ridser", "ridser", "buler/ridser"]);
// Only an 80%+ battery is acceptable for refurbished resale; "Okay (60-80%)",
// "Dårligt (<60%)" and "Ved ikke" all warrant a battery deduction.
const GOOD_BATTERY = new Set(["god (80%+)"]);

const BROKEN_PART_TO_FAULT: { match: string; fault: FaultType }[] = [
  { match: "opladning", fault: "charging" }, // real wizard label
  { match: "ladestik", fault: "charging" },
  { match: "charging", fault: "charging" },
  { match: "skærm-touch", fault: "screen" }, // real wizard label (smartwatch)
  { match: "skærm", fault: "screen" },
  { match: "display", fault: "screen" },
  { match: "bagglas", fault: "back_glass" },
  { match: "bagside", fault: "back_glass" },
  { match: "batteri", fault: "battery" },
];

export function conditionToFaults(condition: BuybackCondition): FaultType[] {
  const faults = new Set<FaultType>();

  if (condition.screen && !GOOD_SCREEN.has(condition.screen.toLowerCase())) {
    faults.add("screen");
  }
  if (condition.back && !GOOD_BACK.has(condition.back.toLowerCase())) {
    faults.add("back_glass");
  }
  if (condition.battery && !GOOD_BATTERY.has(condition.battery.toLowerCase())) {
    faults.add("battery");
  }
  for (const part of condition.brokenParts ?? []) {
    const lower = part.toLowerCase();
    const hit = BROKEN_PART_TO_FAULT.find((m) => lower.includes(m.match));
    if (hit) faults.add(hit.fault);
  }

  return [...faults];
}
