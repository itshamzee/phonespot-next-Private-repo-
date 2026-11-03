/**
 * Frisbii (Flatpay / Billwerk+ Optimize, tidligere Reepay) REST-klient.
 *
 * Kun server-side: den private nøgle må aldrig nå browseren.
 * Docs: https://docs.frisbii.com/docs/new-web-shop
 *
 *   Checkout-API  POST https://checkout-api.frisbii.com/v1/session/charge
 *   Core-API      GET  https://api.frisbii.com/v1/charge/{handle}
 *                 POST https://api.frisbii.com/v1/charge/{handle}/settle
 *                 POST https://api.frisbii.com/v1/charge/{handle}/cancel
 *                 POST https://api.frisbii.com/v1/refund
 *
 * Auth er HTTP Basic med den private nøgle som brugernavn og tom adgangskode.
 */

const DEFAULT_API_URL = "https://api.frisbii.com/v1";
const DEFAULT_CHECKOUT_API_URL = "https://checkout-api.frisbii.com/v1";
const TIMEOUT_MS = 15_000;

export type FrisbiiChargeState =
  | "created"
  | "authorized"
  | "settled"
  | "failed"
  | "cancelled"
  | "pending";

export interface FrisbiiOrderLine {
  ordertext: string;
  /** Pris pr. stk. i øre. */
  amount: number;
  quantity?: number;
  /** Momssats som decimal, f.eks. 0.25. */
  vat?: number;
  amount_incl_vat?: boolean;
}

export interface FrisbiiCustomer {
  handle?: string;
  generate_handle?: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  address2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface FrisbiiAddress {
  first_name?: string;
  last_name?: string;
  address?: string;
  address2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface FrisbiiChargeSessionRequest {
  order: {
    handle: string;
    /** Idempotensnøgle — samme key + handle giver samme svar ved genforsøg. */
    key?: string;
    amount?: number;
    currency?: string;
    ordertext?: string;
    order_lines?: FrisbiiOrderLine[];
    customer?: FrisbiiCustomer;
    customer_handle?: string;
    metadata?: Record<string, string>;
    billing_address?: FrisbiiAddress;
    shipping_address?: FrisbiiAddress;
  };
  settle?: boolean;
  payment_methods?: string[];
  configuration?: string;
  locale?: string;
  /** ISO-8601 varighed, f.eks. "PT30M". */
  ttl?: string;
  phone?: string;
  accept_url?: string;
  cancel_url?: string;
  text_on_statement?: string;
}

export interface FrisbiiChargeSession {
  id: string;
  url: string;
}

export interface FrisbiiCharge {
  handle: string;
  state: FrisbiiChargeState;
  customer: string;
  amount: number;
  currency: string;
  authorized_amount?: number;
  refunded_amount: number;
  created: string;
  authorized?: string;
  settled?: string;
  cancelled?: string;
  transaction?: string;
  error?: string;
  error_state?: "soft_declined" | "hard_declined" | "processing_error" | null;
  processing?: boolean;
  source?: {
    type?: string;
    card_type?: string;
    masked_card?: string;
    provider?: string;
  };
}

export interface FrisbiiRefund {
  id: string;
  invoice: string;
  amount: number;
  currency: string;
  state: "refunded" | "failed" | "processing";
  error?: string;
  error_state?: "hard_declined" | "processing_error" | null;
}

export class FrisbiiError extends Error {
  readonly status: number;
  readonly code: number | null;
  readonly requestId: string | null;

  constructor(message: string, status: number, code: number | null, requestId: string | null) {
    super(message);
    this.name = "FrisbiiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function isFrisbiiConfigured(): boolean {
  return !!process.env.FRISBII_PRIVATE_KEY?.trim();
}

function authHeader(): string {
  const key = process.env.FRISBII_PRIVATE_KEY?.trim();
  if (!key) throw new Error("FRISBII_PRIVATE_KEY is not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function request<T>(
  base: "api" | "checkout",
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const root =
    base === "checkout"
      ? process.env.FRISBII_CHECKOUT_API_URL || DEFAULT_CHECKOUT_API_URL
      : process.env.FRISBII_API_URL || DEFAULT_API_URL;

  const res = await fetch(`${root}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const err = (json ?? {}) as { error?: string; message?: string; code?: number; request_id?: string };
    throw new FrisbiiError(
      `Frisbii ${method} ${path} fejlede (${res.status}): ${err.message || err.error || text.slice(0, 200) || res.statusText}`,
      res.status,
      typeof err.code === "number" ? err.code : null,
      err.request_id ?? null,
    );
  }
  return json as T;
}

const enc = encodeURIComponent;

export const frisbii = {
  createChargeSession(body: FrisbiiChargeSessionRequest): Promise<FrisbiiChargeSession> {
    return request("checkout", "/session/charge", "POST", body);
  },

  /** Returnerer null, hvis Frisbii ikke kender handlet (kunden har ikke forsøgt at betale). */
  async getCharge(handle: string): Promise<FrisbiiCharge | null> {
    try {
      return await request<FrisbiiCharge>("api", `/charge/${enc(handle)}`, "GET");
    } catch (err) {
      if (err instanceof FrisbiiError && err.status === 404) return null;
      throw err;
    }
  },

  settleCharge(handle: string, body: { key?: string; amount?: number } = {}): Promise<FrisbiiCharge> {
    return request("api", `/charge/${enc(handle)}/settle`, "POST", body);
  },

  cancelCharge(handle: string): Promise<FrisbiiCharge> {
    return request("api", `/charge/${enc(handle)}/cancel`, "POST");
  },

  createRefund(body: { invoice: string; key?: string; amount?: number; text?: string }): Promise<FrisbiiRefund> {
    return request("api", "/refund", "POST", body);
  },
};

/** Beløbet, der faktisk er reserveret/hævet på handlet. */
export function chargeAmount(charge: FrisbiiCharge): number {
  return charge.authorized_amount ?? charge.amount;
}

export function isChargePaid(charge: FrisbiiCharge | null): boolean {
  return !!charge && (charge.state === "authorized" || charge.state === "settled");
}
