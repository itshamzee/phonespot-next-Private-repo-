// Shared helpers for device condition/"grade" handling.
//
// Grade N devices are FACTORY-NEW: sealed, never opened, in original
// packaging (Foxway "NEW" stock or manually received new units — see
// supabase/migrations/20260325_foxway_integration.sql and
// src/lib/foxway/parser.ts::mapFoxwayGrade). They must never be marketed or
// fed to Merchant Center / Meta Catalog as "refurbished" — that is both
// factually wrong and, for a sealed retail unit, misleading under Danish
// consumer marketing rules.
//
// Grade P/A/B/C are genuinely refurbished/used stock, cosmetically graded.

import type { DeviceGrade } from "@/lib/supabase/platform-types";

/** True for grade N — factory-sealed, never-used stock. */
export function isNewGrade(grade: string | null | undefined): boolean {
  return grade === "N";
}

/** Google Merchant Center / Meta Catalog `condition` value for a device grade. */
export function merchantCondition(grade: string | null | undefined): "new" | "refurbished" {
  return isNewGrade(grade) ? "new" : "refurbished";
}

/** Short Danish label for a grade, used in feed titles/descriptions in place of "Grade N". */
export function gradeFeedLabel(grade: string): string {
  return isNewGrade(grade) ? "Fabriksny" : `Stand ${grade} Refurbished`;
}

/** Short customer-facing Danish label for a grade (no battery/cosmetic detail). */
export const GRADE_SHORT_LABEL: Record<DeviceGrade, string> = {
  N: "Fabriksny",
  P: "Premiumstand",
  A: "Som ny",
  B: "God stand",
  C: "Brugt stand",
};

/**
 * Standen, som produktsiden viser for en enhed. Nogle fabriksnye enheder er
 * registreret som grade A med "fabriksny" i condition_notes; siden behandler
 * dem som N, og det samme skal feed og JSON-LD gøre.
 */
export function effectiveGrade(device: {
  grade: string | null | undefined;
  condition_notes?: string | null;
}): string {
  if (device.grade === "A" && device.condition_notes?.toLowerCase().includes("fabriksny")) {
    return "N";
  }
  return device.grade ?? "A";
}
