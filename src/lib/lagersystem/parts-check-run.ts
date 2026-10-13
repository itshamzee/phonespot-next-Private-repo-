import { createHash } from "node:crypto";
import type { LagersystemClient } from "./client";
import { locationForStore, storesForLocation } from "./locations";
import {
  aggregateNeeds, aggregateOpenDemand, CLOSED_TICKET_STATUSES, computePartsStatus, serviceIdsForTicket, takenByTicket,
  type OpenTicketShape, type TakenRow,
} from "./parts-check";
import type { PartsStatus, ServicePartLink, ShortageLine } from "./types";

export interface TicketForCheck extends OpenTicketShape {
  store_id: string | null;
  status: string;
  parts_status: PartsStatus | null;
  parts_shortage: ShortageLine[] | null;
  parts_notified_key: string | null;
  ticket_number: string | null;
  device_model: string;
  customer_name: string;
}

export interface PartsCheckRepo {
  getTicket(id: string): Promise<TicketForCheck | null>;
  getLinks(serviceIds: string[]): Promise<ServicePartLink[]>;
  getOtherOpenTickets(storeIds: string[], excludeId: string): Promise<OpenTicketShape[]>;
  /** TAKE-rækker (ikke annulleret, ikke fejlet) for disse dele på tværs af sager. */
  getTaken(skus: string[]): Promise<TakenRow[]>;
  saveStatus(id: string, status: PartsStatus | null, shortage: ShortageLine[] | null, now: Date): Promise<void>;
  /** true = denne kørsel ejer mailen for netop denne mangel (atomisk). */
  claimNotification(id: string, key: string): Promise<boolean>;
  releaseNotification(id: string, key: string): Promise<void>;
  listUnknownOpen(limit: number): Promise<string[]>;
  /** needs_order -> ordered; false hvis sagen ikke manglede dele. */
  setOrdered(id: string): Promise<boolean>;
}

export type Notify = (ticket: TicketForCheck, lines: ShortageLine[]) => Promise<void>;
export interface CheckDeps {
  repo: PartsCheckRepo;
  client: Pick<LagersystemClient, "getBalances" | "getPart">;
  notify: Notify;
  now?: Date;
}
export type CheckOutcome = "skipped" | "no_links" | PartsStatus;

export function shortageKey(lines: ShortageLine[]): string {
  const canonical = [...lines]
    .sort((a, b) => a.shared_sku.localeCompare(b.shared_sku))
    .map((l) => `${l.shared_sku}:${l.needed}`)
    .join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Spec §4.4. Kører efter kundens svar (after()) eller fra cron. Kaster aldrig for
 * et nede lagersystem — status bliver 'unknown', og cron tjekker igen.
 */
export async function checkTicketParts(ticketId: string, deps: CheckDeps): Promise<CheckOutcome> {
  const { repo, client, notify } = deps;
  const now = deps.now ?? new Date();

  const ticket = await repo.getTicket(ticketId);
  if (!ticket || (CLOSED_TICKET_STATUSES as readonly string[]).includes(ticket.status)) return "skipped";
  if (ticket.parts_status === "ordered") return "skipped";
  const location = locationForStore(ticket.store_id);
  if (!location) return "skipped";

  const serviceIds = serviceIdsForTicket(ticket);
  const needs = aggregateNeeds(serviceIds, serviceIds.length ? await repo.getLinks(serviceIds) : []);
  if (needs.size === 0) {
    if (ticket.parts_status !== null) await repo.saveStatus(ticket.id, null, null, now);
    return "no_links";
  }

  let balances: Map<string, number> | null = null;
  try {
    const res = await client.getBalances(location);
    balances = new Map(res.balances.map((b) => [b.shared_sku, b.qty]));
  } catch (err) {
    console.warn("[lagertjek] lagersystemet svarede ikke", ticket.id, err instanceof Error ? err.message : err);
  }

  let otherDemand = new Map<string, number>();
  let ownTaken = new Map<string, number>();
  const skus = [...needs.keys()];
  const taken = await repo.getTaken(skus);
  ownTaken = takenByTicket(taken, ticket.id);
  if (balances) {
    const others = await repo.getOtherOpenTickets(storesForLocation(location), ticket.id);
    const otherServiceIds = [...new Set(others.flatMap(serviceIdsForTicket))];
    const otherLinks = otherServiceIds.length ? await repo.getLinks(otherServiceIds) : [];
    otherDemand = aggregateOpenDemand(others, otherLinks, taken, now);
  }

  // Balance (Bilag A) har intet navn; brug koblingens cache, ellers kataloget.
  for (const [sku, need] of needs) {
    if (need.name || !balances) continue;
    try { need.name = (await client.getPart(sku)).name; } catch { /* sku bruges som navn */ }
  }

  const result = computePartsStatus({ needs, balances, otherDemand, ownTaken });
  await repo.saveStatus(ticket.id, result.status, result.status === "needs_order" ? result.shortage : null, now);

  if (result.status === "needs_order") {
    const key = shortageKey(result.shortage);
    if (await repo.claimNotification(ticket.id, key)) {
      try {
        await notify(ticket, result.shortage);
      } catch (err) {
        console.error("[lagertjek] mail til personalet fejlede", ticket.id, err);
        await repo.releaseNotification(ticket.id, key);
      }
    }
  }
  return result.status ?? "no_links";
}

export async function recheckUnknownTickets(deps: CheckDeps & { limit?: number }): Promise<number> {
  const ids = await deps.repo.listUnknownOpen(deps.limit ?? 20);
  for (const id of ids) {
    try {
      await checkTicketParts(id, deps);
    } catch (err) {
      console.error("[lagertjek] gentjek fejlede", id, err);
    }
  }
  return ids.length;
}
