import type { ChecklistItem, ChecklistStatus } from "@/lib/supabase/types";

// Intet er forhåndsudfyldt som OK: et tomt felt må aldrig se ud som en
// vurdering, ellers dokumenterer indleveringsbeviset skader, ingen har tjekket.
export const INITIAL_CHECKLIST: ChecklistItem[] = [
  { label: "Skærm (ridser/revner/døde pixels)", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Bagside/ramme (buler/ridser)", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Kamera (virker/ridset)", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Opladning", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Lyd/højttaler", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Knapper", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Vandskade-indikator", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Batteri health", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Find My / iCloud", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Adgangskode modtaget", status: "ikke_vurderet", note: "", photo_url: null },
  { label: "Tilbehør indleveret", status: "ikke_vurderet", note: "", photo_url: null },
];

/** Sætter hele listen til OK med ét klik, når enheden er helt normal. */
export function allNormal(checklist: ChecklistItem[]): ChecklistItem[] {
  return checklist.map((item) => ({ ...item, status: "ok" as ChecklistStatus }));
}
