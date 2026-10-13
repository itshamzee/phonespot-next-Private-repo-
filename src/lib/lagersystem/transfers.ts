import type { Availability, Transfer, TransferLine, TransferStatus } from "./api-types";
import { isPhoneSpotLocation, LOCATION_LABELS } from "./locations";

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  REQUESTED: "Anmodet",
  SENT: "Sendt",
  PARTIALLY_RECEIVED: "Delvist modtaget",
  RECEIVED: "Modtaget",
  REJECTED: "Afvist",
  CANCELLED: "Annulleret",
};

/** Spec §2: vejle-hub vises altid som "Hovedlager Vejle"; koden er kun teknisk. */
export function locationLabel(code: string, fallback?: string | null): string {
  return isPhoneSpotLocation(code) ? LOCATION_LABELS[code] : (fallback ?? code);
}

/** Parter i regnestykket (spec §3.5): Hovedlager Vejle er sin egen part. */
export function partyFor(code: string): string {
  if (code === "vejle-hub") return "Hovedlager Vejle";
  return isPhoneSpotLocation(code) ? "PhoneSpot" : code;
}

/** "Undervejs" for en linje: sendt minus modtaget minus afskrevet. */
export function outstanding(line: Pick<TransferLine, "qty_sent" | "qty_received" | "qty_written_off">): number {
  return Math.max(0, (line.qty_sent ?? 0) - line.qty_received - line.qty_written_off);
}

export function formatKr(ore: number): string {
  const [kr, dec] = (Math.round(ore) / 100).toFixed(2).split(".");
  return `${kr.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec} kr.`;
}

export type Settlement =
  | { kind: "none" }
  | { kind: "internal"; text: string }
  | { kind: "owed"; debtor: string; creditor: string; amount_ore: number; missingCost: boolean; text: string };

/** v1 viser kun regnestykket til kostpris; pris-regel og fakturering besluttes senere. */
export function settlement(t: Transfer): Settlement {
  const received = t.lines.filter((l) => l.qty_received > 0);
  if (received.length === 0) return { kind: "none" };
  const creditor = partyFor(t.from);
  const debtor = partyFor(t.to);
  if (creditor === debtor) return { kind: "internal", text: "Intern flytning, intet beløb" };
  const amount_ore = received.reduce((sum, l) => sum + l.qty_received * (l.unit_cost_ore ?? 0), 0);
  const missingCost = received.some((l) => l.unit_cost_ore === null);
  return {
    kind: "owed", debtor, creditor, amount_ore, missingCost,
    text: `${debtor} skylder ${creditor} ${formatKr(amount_ore)} (kostpris)${missingCost ? ". Kostpris mangler på nogle dele" : ""}`,
  };
}

export function availabilityElsewhere(av: Availability[], exclude: string): { location: string; label: string; qty: number }[] {
  return av.filter((a) => a.location !== exclude && a.qty > 0).map((a) => ({ location: a.location, label: locationLabel(a.location, a.location_name), qty: a.qty }));
}
