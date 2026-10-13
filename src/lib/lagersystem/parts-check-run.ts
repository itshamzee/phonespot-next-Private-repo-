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
  /** Åbne sager der skal tjekkes igen: 'unknown', samt 'needs_order' hvor mailen aldrig blev afsendt (nøgle null). */
  listRecheckOpen(limit: number): Promise<string[]>;
  /** Nulstiller mail-nøglen, så en senere identisk mangel mailer igen. */
  clearNotification(id: string): Promise<void>;
  /** needs_order -> ordered; false hvis sagen ikke manglede dele. */
  setOrdered(id: string): Promise<boolean>;
}

export type Notify = (ticket: TicketForCheck, lines: ShortageLine[]) => Promise<void>;
export interface CheckDeps {
  repo: PartsCheckRepo;
  client: Pick<LagersystemClient, "getBalances" | "getPart">;
  notify: Notify;
  now?: Date;
  /** Delt pr. kørsel: lokation -> saldi, eller null hvis lagersystemet ikke svarede. */
  balanceCache?: Map<string, Map<string, number> | null>;
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
  // Manuelt bestilt, eller en flytning er i gang: tjekket må ikke overskrive det.
  if (ticket.parts_status === "ordered" || ticket.parts_status === "requested" || ticket.parts_status === "in_transit") return "skipped";
  const location = locationForStore(ticket.store_id);
  if (!location) return "skipped";

  const serviceIds = serviceIdsForTicket(ticket);
  const needs = aggregateNeeds(serviceIds, serviceIds.length ? await repo.getLinks(serviceIds) : []);
  if (needs.size === 0) {
    if (ticket.parts_status !== null) await repo.saveStatus(ticket.id, null, null, now);
    if (ticket.parts_notified_key !== null) await repo.clearNotification(ticket.id);
    return "no_links";
  }

  let balances: Map<string, number> | null;
  if (deps.balanceCache?.has(location)) {
    balances = deps.balanceCache.get(location) ?? null;
  } else {
    try {
      const res = await client.getBalances(location);
      balances = new Map(res.balances.map((b) => [b.shared_sku, b.qty]));
    } catch (err) {
      balances = null;
      console.warn("[lagertjek] lagersystemet svarede ikke", ticket.id, err instanceof Error ? err.message : err);
    }
    deps.balanceCache?.set(location, balances);
  }

  let otherDemand = new Map<string, number>();
  const taken = await repo.getTaken([...needs.keys()]);
  const ownTaken = takenByTicket(taken, ticket.id);
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

  if (result.status === "ok" && ticket.parts_notified_key !== null) await repo.clearNotification(ticket.id);

  if (result.status === "needs_order") {
    const key = shortageKey(result.shortage);
    if (await repo.claimNotification(ticket.id, key)) {
      try {
        await notify(ticket, result.shortage);
      } catch (err) {
        console.error("[lagertjek] mail til personalet fejlede", ticket.id, err);
        try {
          await repo.releaseNotification(ticket.id, key);
        } catch (releaseErr) {
          console.error("[lagertjek] kunne ikke frigive mail-nøglen", ticket.id, releaseErr);
        }
      }
    }
  }
  return result.status ?? "no_links";
}

/**
 * Gentjek af sager med ukendt status og sager hvis mangel-mail aldrig gik afsted.
 * Saldi hentes højst én gang pr. lokation pr. kørsel, og kørslen stopper ved
 * første ubesvarede kald, så et nede lagersystem ikke æder routens tidsbudget.
 */
export async function recheckUnknownTickets(deps: CheckDeps & { limit?: number }): Promise<number> {
  const ids = await deps.repo.listRecheckOpen(deps.limit ?? 20);
  const balanceCache = deps.balanceCache ?? new Map<string, Map<string, number> | null>();
  let done = 0;
  for (const id of ids) {
    try {
      await checkTicketParts(id, { ...deps, balanceCache });
    } catch (err) {
      console.error("[lagertjek] gentjek fejlede", id, err);
    }
    done++;
    if ([...balanceCache.values()].some((v) => v === null)) break;
  }
  return done;
}
