import type { Transfer, TransferStatus } from "./api-types";
import type { LagersystemClient } from "./client";
import { actorLabel, isPhoneSpotLocation, locationForStore, PHONESPOT_LOCATION_CODES } from "./locations";
import { checkTicketParts, type CheckDeps, type PartsCheckRepo } from "./parts-check-run";
import type { ServiceResult, StaffRef } from "./repair-parts";
import { buildTransferRequestMail } from "./transfer-mail";
import { isLiveTransfer, locationLabel, requestQty, ticketStatusFromTransfers } from "./transfers";
import type { PartsStatus } from "./types";

export interface TicketTransferLink {
  transfer_id: string; ticket_id: string; shared_sku: string; from_location: string; qty: number; status: TransferStatus;
}
export interface TicketTransfersRepo {
  listForTicket(ticketId: string): Promise<TicketTransferLink[]>;
  insert(link: TicketTransferLink): Promise<"ok" | "duplicate">;
  listOpen(limit: number): Promise<TicketTransferLink[]>;
  setStatus(transferId: string, status: TransferStatus): Promise<TicketTransferLink[]>;
  claimMail(transferId: string): Promise<boolean>;
  releaseMail(transferId: string): Promise<void>;
}

const LIVE_TICKET_STATES = new Set(["needs_order", "requested", "in_transit"]);

/** Det almindelige lagertjek (som ved booking), til når en flytning er afsluttet. */
export type StockCheckDeps = Pick<CheckDeps, "client" | "notify">;

function liveState(live: TicketTransferLink[]): PartsStatus {
  return live.some((l) => l.status === "SENT" || l.status === "PARTIALLY_RECEIVED") ? "in_transit" : "requested";
}

/**
 * Sagens mærke efter en ændring i dens flytninger.
 * - Ingen flytning afsluttet for en manglende del: mærket følger de levende flytninger.
 * - En flytning er afsluttet (RECEIVED/REJECTED/CANCELLED): sagen slippes og det
 *   almindelige lagertjek køres igen, så den kun bliver ok, hvis lageret nu dækker
 *   behovet (review fix 1: RECEIVED kan være 0 modtaget eller alt afskrevet).
 *   Er en anden flytning på sagen stadig i gang, beholdes Anmodet/Undervejs for
 *   de dele, den dækker.
 * ok/ordered/unknown/NULL røres aldrig.
 */
async function recomputeTicket(
  ticketId: string,
  deps: { parts: PartsCheckRepo; links: TicketTransfersRepo; now: Date; check?: StockCheckDeps },
): Promise<boolean> {
  const t = await deps.parts.getTicket(ticketId);
  if (!t || !t.parts_status || !LIVE_TICKET_STATES.has(t.parts_status)) return false;
  const links = await deps.links.listForTicket(ticketId);
  const live = links.filter((l) => isLiveTransfer(l.status));
  const shortageSkus = (t.parts_shortage ?? []).map((l) => l.shared_sku);
  const covered = (sku: string) => live.some((l) => l.shared_sku === sku);
  const ended =
    shortageSkus.some((sku) => !covered(sku) && links.some((l) => l.shared_sku === sku && !isLiveTransfer(l.status))) ||
    (t.parts_status !== "needs_order" && live.length === 0);

  if (!ended) {
    const next = shortageSkus.length === 0 ? liveState(live) : ticketStatusFromTransfers(shortageSkus, live);
    if (next === t.parts_status) return false;
    await deps.parts.saveStatus(ticketId, next, t.parts_shortage, deps.now);
    return true;
  }

  if (!deps.check) {
    // Uden adgang til lagertjekket: aldrig ok, kun tilbage til Skal bestilles (cron retter senere).
    const next = live.length > 0 && shortageSkus.every(covered) ? liveState(live) : "needs_order";
    if (next === t.parts_status) return false;
    await deps.parts.saveStatus(ticketId, next, t.parts_shortage, deps.now);
    return true;
  }

  // Slip sagen (checkTicketParts springer requested/in_transit over) og kør lagertjekket.
  if (t.parts_status !== "needs_order") await deps.parts.saveStatus(ticketId, "needs_order", t.parts_shortage, deps.now);
  const outcome = await checkTicketParts(ticketId, { repo: deps.parts, ...deps.check, now: deps.now });
  if (live.length === 0) return true;

  // En anden flytning er stadig i gang: læg dens mærke over lagertjekkets resultat.
  const after = await deps.parts.getTicket(ticketId);
  if (!after) return true;
  if (outcome === "needs_order") {
    const missing = (after.parts_shortage ?? []).map((l) => l.shared_sku);
    if (missing.every(covered)) await deps.parts.saveStatus(ticketId, liveState(live), after.parts_shortage, deps.now);
  } else if (outcome === "unknown" || outcome === "skipped") {
    await deps.parts.saveStatus(ticketId, liveState(live), t.parts_shortage, deps.now);
  } else {
    // ok/no_links: lageret dækker alt; den levende flytning vises stadig, indtil den er afsluttet.
    await deps.parts.saveStatus(ticketId, liveState(live), after.parts_shortage, deps.now);
  }
  return true;
}

/** "Anmod" fra mærket Skal bestilles (spec §4.4): flytning til sagens lokation, sagsnummer som reference. */
export async function requestPartForTicket(
  input: { ticketId: string; sharedSku: string; from: string; staff: StaffRef },
  deps: { parts: PartsCheckRepo; links: TicketTransfersRepo; client: Pick<LagersystemClient, "getAvailability" | "createTransfer">; now?: Date },
): Promise<ServiceResult<Transfer>> {
  const now = deps.now ?? new Date();
  const t = await deps.parts.getTicket(input.ticketId);
  if (!t) return { ok: false, status: 404, message: "Sagen findes ikke" };
  const to = locationForStore(t.store_id);
  if (!to) return { ok: false, status: 409, message: "Vælg butik på sagen først" };
  const line = (t.parts_shortage ?? []).find((l) => l.shared_sku === input.sharedSku);
  if (!line) return { ok: false, status: 409, message: "Delen mangler ikke på sagen" };
  if (input.from === to) return { ok: false, status: 409, message: "Delen kan ikke anmodes fra sagens egen lokation" };

  const there = (await deps.client.getAvailability(input.sharedSku)).find((a) => a.location === input.from)?.qty ?? 0;
  if (there <= 0) return { ok: false, status: 409, message: `${locationLabel(input.from)} har ikke delen længere` };

  const qty = requestQty(line, there);
  const earlier = (await deps.links.listForTicket(t.id)).filter((l) => l.shared_sku === input.sharedSku);
  // Én levende anmodning pr. del; først efter Afvist/Annulleret må der anmodes igen (nyt forsøgsnummer).
  if (earlier.some((l) => l.status !== "REJECTED" && l.status !== "CANCELLED")) {
    return { ok: false, status: 409, message: "Delen er allerede anmodet til sagen" };
  }
  const attempt = earlier.length;
  const { transfer } = await deps.client.createTransfer({
    idempotency_key: `repair:${t.id}:transfer:${input.sharedSku}:${attempt}`,
    from: input.from,
    to,
    lines: [{ shared_sku: input.sharedSku, qty }],
    reference: t.ticket_number ?? t.id,
    note: `Til reparation: ${t.device_model}`,
    actor_label: actorLabel(input.staff),
  });
  await deps.links.insert({ transfer_id: transfer.id, ticket_id: t.id, shared_sku: input.sharedSku, from_location: input.from, qty, status: transfer.status });
  await recomputeTicket(t.id, { parts: deps.parts, links: deps.links, now });
  return { ok: true, value: transfer };
}

export async function syncTicketsForTransfer(
  transfer: Transfer,
  deps: { parts: PartsCheckRepo; links: TicketTransfersRepo; now?: Date } & StockCheckDeps,
): Promise<number> {
  const rows = await deps.links.setStatus(transfer.id, transfer.status);
  let changed = 0;
  for (const ticketId of new Set(rows.map((r) => r.ticket_id))) {
    const check = { client: deps.client, notify: deps.notify };
    if (await recomputeTicket(ticketId, { parts: deps.parts, links: deps.links, now: deps.now ?? new Date(), check })) changed++;
  }
  return changed;
}

/** Cron: flytninger, andre har handlet på, opdaterer sagernes mærke. */
export async function syncOpenTicketTransfers(deps: {
  parts: PartsCheckRepo; links: TicketTransfersRepo; client: Pick<LagersystemClient, "getTransfer" | "getBalances" | "getPart">;
  notify: CheckDeps["notify"]; now?: Date; limit?: number;
}): Promise<number> {
  const ids = [...new Set((await deps.links.listOpen(deps.limit ?? 50)).map((l) => l.transfer_id))];
  for (const id of ids) {
    try {
      await syncTicketsForTransfer(await deps.client.getTransfer(id), deps);
    } catch (err) {
      console.error("[flytninger] kunne ikke synkronisere", id, err);
    }
  }
  return ids.length;
}

/** Én mail pr. flytnings-id til afsenderens personale, kun for nye anmodninger fra PhoneSpots lokationer. */
export async function notifyNewTransferOnce(
  transfer: Transfer,
  deps: { links: TicketTransfersRepo; send: (mail: { to: string; subject: string; text: string }) => Promise<void> },
): Promise<boolean> {
  if (transfer.status !== "REQUESTED" || !isPhoneSpotLocation(transfer.from)) return false;
  if (!(await deps.links.claimMail(transfer.id))) return false;
  try {
    await deps.send(buildTransferRequestMail(transfer));
    return true;
  } catch (err) {
    console.error("[flytninger] mail om anmodning fejlede", transfer.id, err);
    await deps.links.releaseMail(transfer.id);
    return false;
  }
}

/**
 * PhoneSpot hører kun om anmodninger oprettet andre steder (Fixon, iDriveRep,
 * lagersystemets skærm) ved at spørge: GET /transfers pr. egen lokation.
 */
export async function pollRequestedTransfers(deps: {
  client: Pick<LagersystemClient, "listTransfers">; links: TicketTransfersRepo;
  send: (mail: { to: string; subject: string; text: string }) => Promise<void>;
}): Promise<number> {
  let mailed = 0;
  for (const location of PHONESPOT_LOCATION_CODES) {
    try {
      const transfers = await deps.client.listTransfers({ location, status: ["REQUESTED"], direction: "out" });
      for (const t of transfers) if (await notifyNewTransferOnce(t, deps)) mailed++;
    } catch (err) {
      console.warn("[flytninger] kunne ikke hente anmodninger for", location, err instanceof Error ? err.message : err);
    }
  }
  return mailed;
}
