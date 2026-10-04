import type { RepairStatus } from "@/lib/supabase/types";

export const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  diagnostik: "Diagnostik",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "Klar til kunde",
  afhentet: "Afhentet",
  bero: "Bero",
  reklamation_modtaget: "Reklamation modtaget",
  reklamation_vurderet: "Reklamation vurderet",
  reklamation_loest: "Reklamation løst",
  annulleret: "Annulleret",
};

/**
 * Næste faste trin i forløbet. "Færdig" og "afhentet" tages af Meld klar.
 * Reklamationsstatusser står bevidst ikke her: status-ruten afviser dem.
 */
export const NEXT_STATUS: Partial<Record<RepairStatus, RepairStatus>> = {
  modtaget: "diagnostik",
  tilbud_sendt: "godkendt",
  godkendt: "i_gang",
};
