/**
 * Samlet tracking af forretningshændelser.
 *
 * Hver hændelse sendes til GA4 + Google Ads (begge via samme gtag-kald, med
 * GA4-anbefalede eventnavne) og Meta Pixel (standard-event) med ét fælles
 * event_id, så en senere server-side CAPI-hændelse kan deduplikeres.
 *
 * Samtykke: gtag styres af Consent Mode v2 (ad_storage/analytics_storage), og
 * fbq er sat til consent revoke indtil accept. Som ekstra sikkerhed sender vi
 * kun til Meta, når besøgende aktivt har accepteret.
 */
import { readStoredConsent } from "@/lib/consent-client";

type Params = Record<string, unknown>;

export type TrackStore = "vejle" | "slagelse" | "webshop" | "indsend";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function newEventId(prefix = "evt"): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

function clean(params: Params): Params {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
}

function sendGtag(name: string, params: Params): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, clean(params));
}

function sendMeta(name: string, params: Params, eventId: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (readStoredConsent() !== "accepted") return;
  window.fbq("track", name, clean(params), { eventID: eventId });
}

/* ------------------------------------------------------------------ */
/*  Kilde / UTM (første berøring, sessionStorage)                      */
/* ------------------------------------------------------------------ */

const ATTRIBUTION_KEY = "ps-attribution";
const ATTRIBUTION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid"] as const;
export type Attribution = Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>>;

/** Gem første utm_*, gclid og fbclid i sessionStorage. Overskriver aldrig. */
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return;
    const search = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const field of ATTRIBUTION_FIELDS) {
      const value = search.get(field);
      if (value) found[field] = value.slice(0, 200);
    }
    if (Object.keys(found).length > 0) sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    // Privat tilstand / blokeret storage: ingen kildedata, ingen fejl.
  }
}

export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Hjælpere                                                           */
/* ------------------------------------------------------------------ */

/** Udled butik fra en sti som /reparation-vejle eller /butik/slagelse. */
export function storeFromPath(path: string): TrackStore {
  const p = path.toLowerCase();
  if (p.includes("vejle")) return "vejle";
  if (p.includes("slagelse")) return "slagelse";
  return "webshop";
}

/** Normalisér fri butiksværdi ("Vejle", "Send ind", null) til TrackStore. */
export function normalizeTrackStore(value: string | null | undefined, fallback: TrackStore = "webshop"): TrackStore {
  const v = (value ?? "").toLowerCase();
  if (v.includes("vejle")) return "vejle";
  if (v.includes("slagelse")) return "slagelse";
  if (v.includes("send") || v.includes("indsend")) return "indsend";
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  Hændelser                                                          */
/* ------------------------------------------------------------------ */

export interface RepairBookingInput {
  store: TrackStore;
  brand?: string;
  model?: string;
  service?: string;
  value?: number; // DKK
  /** Fast id (fx sags-id) giver stabil dedup mod CAPI og genindlæsning. */
  eventId?: string;
}

export function trackRepairBooking(input: RepairBookingInput): string {
  const eventId = input.eventId ?? newEventId("repair");
  const value = input.value ?? 0;
  sendGtag("repair_booking", {
    store: input.store,
    brand: input.brand,
    model: input.model,
    service: input.service,
    value,
    currency: "DKK",
    event_id: eventId,
  });
  sendMeta(
    "Schedule",
    {
      content_name: [input.brand, input.model].filter(Boolean).join(" "),
      content_category: input.service,
      store: input.store,
      value,
      currency: "DKK",
    },
    eventId,
  );
  return eventId;
}

export type LeadType = "contact_form" | "buyback" | "business_repair";

export function trackLead(input: { leadType: LeadType; store?: TrackStore; value?: number }): string {
  const eventId = newEventId("lead");
  const currency = input.value !== undefined ? "DKK" : undefined;
  sendGtag("generate_lead", {
    lead_type: input.leadType,
    store: input.store,
    value: input.value,
    currency,
    event_id: eventId,
  });
  sendMeta(
    "Lead",
    { content_category: input.leadType, store: input.store, value: input.value, currency },
    eventId,
  );
  return eventId;
}

export function trackClickToCall(input: { store: TrackStore; pagePath: string; phone?: string }): string {
  const eventId = newEventId("call");
  sendGtag("click_to_call", { store: input.store, page_path: input.pagePath, phone: input.phone, event_id: eventId });
  sendMeta("Contact", { content_category: "call", store: input.store }, eventId);
  return eventId;
}

export function trackGetDirections(input: { store: TrackStore; pagePath: string }): string {
  const eventId = newEventId("dir");
  sendGtag("get_directions", { store: input.store, page_path: input.pagePath, event_id: eventId });
  sendMeta("FindLocation", { content_category: "directions", store: input.store }, eventId);
  return eventId;
}

export function trackMessagingClick(input: {
  channel: "whatsapp" | "messenger";
  store: TrackStore;
  pagePath: string;
}): string {
  const eventId = newEventId("msg");
  sendGtag(`click_to_${input.channel}`, { store: input.store, page_path: input.pagePath, event_id: eventId });
  sendMeta("Contact", { content_category: input.channel, store: input.store }, eventId);
  return eventId;
}

export interface Ga4Item {
  item_id: string;
  item_name: string;
  price: number; // DKK
  quantity: number;
}

const PURCHASE_SENT_PREFIX = "ps-ga4-purchase:";

/**
 * GA4 `purchase` med items. Sendes ellers ingen steder (kun page_view fra
 * <GoogleAnalytics>), så ingen dobbelttælling. Sendes højst én gang pr.
 * transaction_id pr. session, så genindlæsning af bekræftelsessiden ikke
 * tæller to gange. manual_event_PURCHASE (Ads) er uændret og separat.
 */
export function trackGa4Purchase(input: {
  transactionId: string;
  value: number;
  shipping?: number;
  items: Ga4Item[];
}): void {
  try {
    const key = PURCHASE_SENT_PREFIX + input.transactionId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Uden storage kan vi ikke dedupe lokalt; send alligevel.
  }
  sendGtag("purchase", {
    transaction_id: input.transactionId,
    value: input.value,
    shipping: input.shipping,
    currency: "DKK",
    items: input.items,
  });
}
