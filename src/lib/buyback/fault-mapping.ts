// Foneday raw categories observed: e.g. "Display", "Battery",
// "Charging Connector"/"Charger", "Back Cover"/"Rear Housing".
// Qualities: "Service Pack", "Pulled", "Refurbished", "OEM-Equivalent", "FDX *".
// Keyword matching is case-insensitive substring — adjust to the real strings
// if they differ.
import type { BuybackCondition, FaultType } from "./types";

// "Original" tiers only (genuine parts), per the design decision.
export const faultQualityKeywords: string[] = ["service", "pulled", "refurbished"];

export const faultCategoryKeywords: Record<FaultType, string[]> = {
  screen: ["display", "lcd", "scherm", "screen"],
  back_glass: ["back", "rear", "housing", "achterkant"],
  battery: ["battery", "batterij", "accu"],
  charging: ["charging", "charge connector", "dock", "laad"],
};

const GOOD_SCREEN = new Set(["perfekt", "god", "let brugt", "fin"]);
const GOOD_BACK = new Set(["perfekt", "god", "let brugt", "fin"]);
const GOOD_BATTERY = new Set(["god", "perfekt", "ny", "fin"]);

const BROKEN_PART_TO_FAULT: { match: string; fault: FaultType }[] = [
  { match: "ladestik", fault: "charging" },
  { match: "charging", fault: "charging" },
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
