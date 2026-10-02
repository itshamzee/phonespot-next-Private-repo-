import type { TradeInDerivedStatus } from "@/lib/supabase/trade-in-types";

/* ------------------------------------------------------------------ */
/*  URL state for the buyback overview                                 */
/* ------------------------------------------------------------------ */

export type OverviewFolder = "aktive" | "afviste";
export type OverviewStore = "alle" | "slagelse" | "vejle" | "generel";

export interface OverviewUrlState {
  folder: OverviewFolder;
  /** A derived status, or "alle". */
  filter: TradeInDerivedStatus | "alle";
  store: OverviewStore;
  search: string;
}

export const DEFAULT_OVERVIEW_STATE: OverviewUrlState = {
  folder: "aktive",
  filter: "alle",
  store: "alle",
  search: "",
};

const STORES: OverviewStore[] = ["alle", "slagelse", "vejle", "generel"];
const CLOSED: TradeInDerivedStatus[] = ["afvist", "lukket"];

interface ParamsLike {
  get(name: string): string | null;
}

/**
 * Reads the overview state out of search params. Unknown or garbage values fall
 * back to the defaults, so a stale or hand-edited link never breaks the page.
 * `validStatuses` is the list of statuses a filter may be.
 */
export function parseOverviewState(
  params: ParamsLike,
  validStatuses: readonly TradeInDerivedStatus[],
): OverviewUrlState {
  const rawFilter = params.get("status");
  const filter =
    rawFilter && (validStatuses as readonly string[]).includes(rawFilter)
      ? (rawFilter as TradeInDerivedStatus)
      : "alle";

  const rawFolder = params.get("mappe");
  let folder: OverviewFolder = rawFolder === "afviste" ? "afviste" : "aktive";
  // A closed status only exists in the closed folder.
  if (filter !== "alle") folder = CLOSED.includes(filter) ? "afviste" : "aktive";

  const rawStore = params.get("butik");
  const store = (STORES as string[]).includes(rawStore ?? "") ? (rawStore as OverviewStore) : "alle";

  return { folder, filter, store, search: (params.get("q") ?? "").slice(0, 100) };
}

/** Query string (without "?") for the state; defaults are omitted. */
export function buildOverviewQuery(state: OverviewUrlState): string {
  const p = new URLSearchParams();
  if (state.folder !== "aktive") p.set("mappe", state.folder);
  if (state.filter !== "alle") p.set("status", state.filter);
  if (state.store !== "alle") p.set("butik", state.store);
  const q = state.search.trim();
  if (q) p.set("q", q);
  return p.toString();
}

/* ------------------------------------------------------------------ */
/*  Row facts                                                          */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

export function daysBetween(fromIso: string, now: number): number {
  const t = new Date(fromIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY));
}

export interface OverviewOfferFacts {
  status: string;
  created_at: string;
  responded_at?: string | null;
  received_at?: string | null;
  seller_bank_reg?: string | null;
  seller_bank_account?: string | null;
}

export interface OverviewReceiptFacts {
  status: string;
  created_at?: string | null;
  confirmed_at?: string | null;
  paid_at?: string | null;
}

export interface OverviewLabelFacts {
  created_at?: string | null;
  in_transit_at?: string | null;
  delivered_at?: string | null;
}

export interface OverviewFacts {
  createdAt: string;
  offers: OverviewOfferFacts[];
  receipts: OverviewReceiptFacts[];
  label: OverviewLabelFacts | null;
}

function latest(...values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const v of values) {
    if (!v) continue;
    if (!best || new Date(v).getTime() > new Date(best).getTime()) best = v;
  }
  return best;
}

/** The accepted offer the row is about: the most recently created one. */
export function acceptedOffer<T extends OverviewOfferFacts>(offers: T[]): T | null {
  const accepted = offers.filter((o) => o.status === "accepted");
  if (accepted.length === 0) return null;
  return accepted.reduce((a, b) =>
    new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a,
  );
}

export function acceptedAt(offers: OverviewOfferFacts[]): string | null {
  const o = acceptedOffer(offers);
  return o ? (o.responded_at ?? o.created_at) : null;
}

/** The offer to show a price for: accepted, else newest pending, else newest. */
export function latestOffer<T extends OverviewOfferFacts>(offers: T[]): T | null {
  if (offers.length === 0) return null;
  const byNewest = [...offers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return (
    byNewest.find((o) => o.status === "accepted") ??
    byNewest.find((o) => o.status === "pending") ??
    byNewest[0]
  );
}

/** Newest timestamp we know of anywhere on the case. Drives sorting. */
export function lastActivity(facts: OverviewFacts): string {
  return (
    latest(
      facts.createdAt,
      ...facts.offers.flatMap((o) => [o.created_at, o.responded_at, o.received_at]),
      ...facts.receipts.flatMap((r) => [r.created_at, r.confirmed_at, r.paid_at]),
      facts.label?.created_at,
      facts.label?.in_transit_at,
      facts.label?.delivered_at,
    ) ?? facts.createdAt
  );
}

/** When the case entered its current stage; falls back to creation. */
export function stageSince(status: TradeInDerivedStatus, facts: OverviewFacts): string {
  const accepted = acceptedOffer(facts.offers);
  let at: string | null | undefined = null;
  switch (status) {
    case "tilbud_sendt":
      at = latest(...facts.offers.filter((o) => o.status === "pending").map((o) => o.created_at));
      break;
    case "accepteret":
      at = acceptedAt(facts.offers);
      break;
    case "afventer_forsendelse":
      at = facts.label?.created_at;
      break;
    case "paa_vej":
      at = facts.label?.in_transit_at;
      break;
    case "leveret":
      at = facts.label?.delivered_at;
      break;
    case "modtaget":
      at = accepted?.received_at ?? latest(...facts.receipts.map((r) => r.created_at));
      break;
    case "vurderet":
      at = latest(...facts.receipts.map((r) => r.confirmed_at));
      break;
    case "betalt":
      at = latest(...facts.receipts.map((r) => r.paid_at));
      break;
    default:
      at = null;
  }
  return at ?? facts.createdAt;
}

export type PayoutState = "udbetalt" | "skal_udbetales" | "mangler_bank";

/** Null when there is nothing to pay out (no accepted offer). */
export function payoutState(facts: OverviewFacts): PayoutState | null {
  const accepted = acceptedOffer(facts.offers);
  if (!accepted) return null;
  if (facts.receipts.some((r) => r.status === "paid" || r.status === "completed")) return "udbetalt";
  if (!accepted.seller_bank_reg || !accepted.seller_bank_account) return "mangler_bank";
  return "skal_udbetales";
}

export const PAYOUT_LABELS: Record<PayoutState, string> = {
  udbetalt: "Udbetalt",
  skal_udbetales: "Skal udbetales",
  mangler_bank: "Mangler bankoplysninger",
};

/** "i dag", "i går", "5 dage", "3 uger", "2 mdr". */
export function formatDays(days: number): string {
  if (days <= 0) return "i dag";
  if (days === 1) return "i går";
  if (days < 7) return `${days} dage`;
  if (days < 31) return `${Math.floor(days / 7)} uger`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "måned" : "mdr"}`;
}
