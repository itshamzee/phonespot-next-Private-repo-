/**
 * Meta Conversions API (server-side) — kun Purchase indtil videre.
 *
 * Browserens Purchase kan gå tabt (adblock, lukket fane, pixel ikke indlæst),
 * så Stripe-webhooken sender samme køb direkte til Meta. Begge bærer samme
 * event_id (purchase_<order.id>), så Meta deduplikerer.
 *
 * Samtykke: der sendes kun, når kunden havde accepteret marketing-cookies,
 * da checkout blev startet (gemt som meta_consent i Stripe-sessionens
 * metadata). Det følger samme regel som browser-pixlen.
 *
 * Sikkerhed: sendPurchaseToMeta kaster aldrig — fejl logges og sluges, så
 * betalings-webhooken aldrig fejler på grund af tracking.
 */
import { createHash } from "node:crypto";
import { purchaseEventId } from "./purchase-event-id";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";
const REQUEST_TIMEOUT_MS = 4000;
const STRIPE_METADATA_MAX = 500;

/* ------------------------------------------------------------------ */
/*  Normalisering + hashing (Meta "Customer information parameters")   */
/* ------------------------------------------------------------------ */

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const v = (email ?? "").trim().toLowerCase();
  return v.includes("@") ? v : null;
}

/**
 * Kun cifre, med landekode, uden foranstillede nuller. Danske numre uden
 * landekode (8 cifre) får 45 foran.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  if (digits.length === 8) digits = `45${digits}`;
  return digits.length >= 8 ? digits : null;
}

/* ------------------------------------------------------------------ */
/*  Browser-kontekst gemt på Stripe-sessionen                           */
/* ------------------------------------------------------------------ */

export interface MetaBrowserContext {
  consent: boolean;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

function clip(v: string | null | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t ? t.slice(0, STRIPE_METADATA_MAX) : undefined;
}

/** Stripe-metadata (maks 500 tegn pr. værdi). Tom uden samtykke. */
export function metaCheckoutMetadata(ctx: MetaBrowserContext): Record<string, string> {
  if (!ctx.consent) return {};
  const out: Record<string, string> = { meta_consent: "1" };
  const fields: Array<[string, string | undefined]> = [
    ["meta_fbp", clip(ctx.fbp)],
    ["meta_fbc", clip(ctx.fbc)],
    ["meta_ip", clip(ctx.clientIp)],
    ["meta_ua", clip(ctx.userAgent)],
  ];
  for (const [k, v] of fields) if (v) out[k] = v;
  return out;
}

export function metaContextFromMetadata(
  metadata: Record<string, string> | null | undefined,
): MetaBrowserContext {
  const m = metadata ?? {};
  return {
    consent: m.meta_consent === "1",
    fbp: m.meta_fbp || null,
    fbc: m.meta_fbc || null,
    clientIp: m.meta_ip || null,
    userAgent: m.meta_ua || null,
  };
}

/** Første IP fra x-forwarded-for (Vercel sætter den). */
export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}

/* ------------------------------------------------------------------ */
/*  Payload                                                            */
/* ------------------------------------------------------------------ */

export interface PurchaseInput {
  orderId: string;
  orderNumber: string;
  /** Ordretotal i øre (som i databasen). */
  totalOere: number;
  contentIds: string[];
  numItems: number;
  email?: string | null;
  phone?: string | null;
  customerId?: string | null;
  context: MetaBrowserContext;
  eventSourceUrl: string;
  /** Unix-sekunder. Default: nu. */
  eventTime?: number;
}

export interface CapiEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: Record<string, string | string[]>;
  custom_data: Record<string, unknown>;
}

export function buildPurchaseEvent(input: PurchaseInput): CapiEvent {
  const userData: Record<string, string | string[]> = {};
  const email = normalizeEmail(input.email);
  if (email) userData.em = [sha256(email)];
  const phone = normalizePhone(input.phone);
  if (phone) userData.ph = [sha256(phone)];
  if (input.customerId) userData.external_id = [sha256(input.customerId)];
  userData.country = [sha256("dk")];
  if (input.context.fbp) userData.fbp = input.context.fbp;
  if (input.context.fbc) userData.fbc = input.context.fbc;
  if (input.context.clientIp) userData.client_ip_address = input.context.clientIp;
  if (input.context.userAgent) userData.client_user_agent = input.context.userAgent;

  return {
    event_name: "Purchase",
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: purchaseEventId(input.orderId),
    action_source: "website",
    event_source_url: input.eventSourceUrl,
    user_data: userData,
    custom_data: {
      currency: "DKK",
      value: Math.round(input.totalOere) / 100,
      content_ids: input.contentIds,
      content_type: "product",
      num_items: input.numItems,
      order_id: input.orderNumber,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Afsendelse                                                         */
/* ------------------------------------------------------------------ */

export type CapiResult =
  | { status: "sent"; eventsReceived: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function capiConfig(): { pixelId: string; token: string } | null {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  return token && pixelId ? { pixelId, token } : null;
}

export async function sendCapiEvents(events: CapiEvent[]): Promise<CapiResult> {
  const config = capiConfig();
  if (!config) return { status: "skipped", reason: "META_CAPI_ACCESS_TOKEN eller pixel-id mangler" };

  const body: Record<string, unknown> = { data: events };
  if (process.env.META_CAPI_TEST_EVENT_CODE) body.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.pixelId}/events?access_token=${encodeURIComponent(config.token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as { events_received?: number; error?: { message?: string } };
  if (!res.ok) return { status: "failed", error: `HTTP ${res.status}: ${json.error?.message ?? "ukendt fejl"}` };
  return { status: "sent", eventsReceived: json.events_received ?? 0 };
}

/**
 * Send Purchase til Meta. Kaster aldrig. Springer over uden samtykke, uden
 * token, eller for ordrer på 0 kr.
 */
export async function sendPurchaseToMeta(input: PurchaseInput): Promise<CapiResult> {
  try {
    if (!input.context.consent) return { status: "skipped", reason: "intet marketing-samtykke" };
    if (!(input.totalOere > 0)) return { status: "skipped", reason: "ordretotal er 0" };
    const result = await sendCapiEvents([buildPurchaseEvent(input)]);
    if (result.status === "failed") console.error("[meta-capi] Purchase fejlede:", input.orderNumber, result.error);
    else if (result.status === "sent") console.log("[meta-capi] Purchase sendt:", input.orderNumber);
    else console.warn("[meta-capi] Purchase sprunget over:", input.orderNumber, result.reason);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[meta-capi] Purchase fejlede:", input.orderNumber, error);
    return { status: "failed", error };
  }
}
