import type { PartsStatus, ServicePartLink, ShortageLine } from "./types";

/** Sager i disse statusser trækker ikke længere på lageret. */
export const CLOSED_TICKET_STATUSES = ["faerdig", "afhentet", "reklamation_loest"] as const;
/** En forudbetalt online-booking, der ikke er betalt efter 2 timer, regnes som opgivet. */
export const ABANDONED_CHECKOUT_MS = 2 * 60 * 60 * 1000;

export type TicketServicesShape = { booking_details?: unknown; services?: unknown };
export type OpenTicketShape = TicketServicesShape & {
  id: string;
  paid?: boolean | null;
  stripe_session_id?: string | null;
  created_at?: string | null;
};
export type Need = { qty: number; name: string | null };
export type TakenRow = { ticket_id: string; shared_sku: string; qty: number };

function idsFrom(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => (s && typeof s === "object" ? (s as { id?: unknown }).id : null))
    .filter((id): id is string => typeof id === "string" && id.length > 0 && !id.startsWith("custom-"));
}

/**
 * Ydelses-id'er på en sag: online-booking gemmer dem i booking_details.selected_services,
 * indlevering i services. Egne fritekst-ydelser ("custom-…") har ingen kobling.
 */
export function serviceIdsForTicket(t: TicketServicesShape): string[] {
  const bd = (t.booking_details && typeof t.booking_details === "object" ? t.booking_details : null) as
    | { selected_services?: unknown }
    | null;
  return [...new Set([...idsFrom(bd?.selected_services), ...idsFrom(t.services)])];
}

export function aggregateNeeds(serviceIds: string[], links: ServicePartLink[]): Map<string, Need> {
  const wanted = new Set(serviceIds);
  const needs = new Map<string, Need>();
  for (const l of links) {
    if (!wanted.has(l.service_id)) continue;
    const cur = needs.get(l.shared_sku);
    needs.set(l.shared_sku, { qty: (cur?.qty ?? 0) + l.qty, name: cur?.name ?? l.part_name ?? null });
  }
  return needs;
}

export function countsAsOpenDemand(t: OpenTicketShape, now: Date): boolean {
  if (t.stripe_session_id && !t.paid && t.created_at) {
    const created = new Date(t.created_at).getTime();
    if (Number.isNaN(created)) return true; // ulæselig dato: hellere for meget behov end for lidt
    return now.getTime() - created < ABANDONED_CHECKOUT_MS;
  }
  return true;
}

export function takenByTicket(taken: TakenRow[], ticketId: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of taken) if (r.ticket_id === ticketId) out.set(r.shared_sku, (out.get(r.shared_sku) ?? 0) + r.qty);
  return out;
}

/**
 * Hvad andre åbne sager på samme lokation stadig skal bruge (dele, de allerede har taget, er trukket fra saldoen).
 * OBS: kalderen skal selv udelade den sag, der tjekkes (tickets må ikke indeholde den), ellers tælles den dobbelt.
 */
export function aggregateOpenDemand(
  tickets: OpenTicketShape[],
  links: ServicePartLink[],
  taken: TakenRow[],
  now: Date,
): Map<string, number> {
  const demand = new Map<string, number>();
  for (const t of tickets) {
    if (!countsAsOpenDemand(t, now)) continue;
    const used = takenByTicket(taken, t.id);
    for (const [sku, need] of aggregateNeeds(serviceIdsForTicket(t), links)) {
      const remaining = Math.max(0, need.qty - (used.get(sku) ?? 0));
      if (remaining > 0) demand.set(sku, (demand.get(sku) ?? 0) + remaining);
    }
  }
  return demand;
}

/**
 * Spec §4.4: saldo minus egne åbne sagers behov; under det nødvendige antal = "skal bestilles".
 * balances = null betyder, at lagersystemet ikke svarede → 'unknown'.
 */
export function computePartsStatus(input: {
  needs: Map<string, Need>;
  balances: Map<string, number> | null;
  otherDemand: Map<string, number>;
  ownTaken: Map<string, number>;
}): { status: PartsStatus | null; shortage: ShortageLine[] } {
  if (input.needs.size === 0) return { status: null, shortage: [] };
  const open = [...input.needs]
    .map(([sku, n]) => [sku, { ...n, qty: n.qty - (input.ownTaken.get(sku) ?? 0) }] as const)
    .filter(([, n]) => n.qty > 0);
  if (open.length === 0) return { status: "ok", shortage: [] };
  if (!input.balances) return { status: "unknown", shortage: [] };

  const shortage: ShortageLine[] = [];
  for (const [sku, n] of open) {
    const available = (input.balances.get(sku) ?? 0) - (input.otherDemand.get(sku) ?? 0);
    if (available < n.qty) shortage.push({ shared_sku: sku, name: n.name ?? sku, needed: n.qty, available });
  }
  shortage.sort((a, b) => a.shared_sku.localeCompare(b.shared_sku));
  return { status: shortage.length > 0 ? "needs_order" : "ok", shortage };
}

/** "Når delen tilføjes under Dele brugt, ryddes mærket" (spec §4.4). */
export function applyPartAdded(
  status: PartsStatus | null,
  shortage: ShortageLine[] | null,
  sku: string,
): { status: PartsStatus | null; shortage: ShortageLine[] | null; changed: boolean } {
  if (status !== "needs_order" && status !== "ordered") return { status, shortage, changed: false };
  const before = shortage ?? [];
  const remaining = before.filter((l) => l.shared_sku !== sku);
  if (remaining.length === before.length) return { status, shortage, changed: false };
  return remaining.length === 0
    ? { status: "ok", shortage: null, changed: true }
    : { status, shortage: remaining, changed: true };
}
