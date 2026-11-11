/**
 * Flatpay Socket API client (in-store card terminals). SERVER ONLY.
 *
 * API: https://socket-api.flatpay.dk (OpenAPI at /v3/api-docs).
 * Flow per card payment:
 *   1. POST /socket/transaction/start   (amount in øre, our own transactionReference UUID)
 *   2. GET  /socket/transaction/response until the status is no longer PENDING
 *   3. POST /socket/transaction/cancel  when the cashier aborts or we time out
 *
 * The partner token ("GUID") authorises every call. It travels in query strings
 * on GET calls (Flatpay's design), so request URLs are never logged here.
 *
 * Configuration (env):
 *   FLATPAY_GUID                     partner token; or, if not set:
 *   FLATPAY_USERNAME / FLATPAY_PASSWORD  exchanged for a GUID on first use
 *   FLATPAY_TERMINAL_<STORE>         terminal id per store, e.g. FLATPAY_TERMINAL_VEJLE
 *   FLATPAY_API_URL                  optional, defaults to production
 *   FLATPAY_TIMEOUT_MS               optional, how long we wait for the customer (default 90 s)
 */
import { createHash } from "node:crypto";

export const FLATPAY_DEFAULT_URL = "https://socket-api.flatpay.dk";
export const FLATPAY_DEFAULT_TIMEOUT_MS = 90_000;
/** Vercel route budget is 120 s; leave room for the cancel + final lookup. */
const MAX_TIMEOUT_MS = 100_000;
const REQUEST_TIMEOUT_MS = 15_000;

export type FlatpayStatus = "COMPLETED" | "FAILED_CREATING" | "CANCELLED" | "PENDING" | "DECLINED";
export type FlatpayTransactionType = "SALE" | "REFUND";

/** GET /socket/transaction/response (the fields we use). */
export type FlatpayTransaction = {
  transactionReference?: string;
  terminalId?: string;
  status?: FlatpayStatus;
  amount?: number;
  transactionType?: string;
  cardScheme?: string | null;
  cardPan?: string | null;
  receiptNumber?: string | null;
  authorizationCode?: string | null;
  errorText?: string | null;
  errorCode?: string | null;
};

type Env = Record<string, string | undefined>;
type FetchFn = typeof fetch;

export type FlatpayConfig = {
  baseUrl: string;
  guid?: string;
  username?: string;
  password?: string;
  timeoutMs: number;
  terminals: Record<string, string>;
};

export function flatpayConfig(env: Env = process.env): FlatpayConfig {
  const terminals: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    const m = /^FLATPAY_TERMINAL_([A-Z0-9_]+)$/.exec(key);
    if (m && value?.trim()) terminals[m[1].toLowerCase()] = value.trim();
  }
  const timeout = Number(env.FLATPAY_TIMEOUT_MS);
  return {
    baseUrl: (env.FLATPAY_API_URL?.trim() || FLATPAY_DEFAULT_URL).replace(/\/+$/, ""),
    guid: env.FLATPAY_GUID?.trim() || undefined,
    username: env.FLATPAY_USERNAME?.trim() || undefined,
    password: env.FLATPAY_PASSWORD || undefined,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? Math.min(timeout, MAX_TIMEOUT_MS) : FLATPAY_DEFAULT_TIMEOUT_MS,
    terminals,
  };
}

/** Terminal id for a store slug ("vejle" -> FLATPAY_TERMINAL_VEJLE). Dashes become underscores. */
export function flatpayTerminalId(config: FlatpayConfig, locationSlug: string): string | undefined {
  const key = locationSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return key ? config.terminals[key] : undefined;
}

/**
 * Stable UUID for one of our payment-line references. Flatpay lets the caller
 * choose transactionReference, so deriving it from our own reference means a
 * retry never starts a second payment (Flatpay answers 202 "already started"),
 * and the cancel route can find the pending payment without any stored state.
 */
export function flatpayTransactionReference(reference: string): string {
  const h = createHash("sha256").update(`phonespot-flatpay:${reference}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version 5 layout
  h[8] = (h[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export class FlatpayError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 for network/timeout. */
    readonly status: number,
    readonly developerCode?: string,
  ) {
    super(message);
    this.name = "FlatpayError";
  }
}

export type FlatpayDeps = {
  fetch?: FetchFn;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** GUID from username/password, kept per server instance (one login per cold start). */
let cachedGuid: { key: string; guid: string } | null = null;

/** Tests only. */
export function resetFlatpayGuidCache() {
  cachedGuid = null;
}

export class FlatpayClient {
  private readonly fetch: FetchFn;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;

  constructor(
    readonly config: FlatpayConfig,
    deps: FlatpayDeps = {},
  ) {
    this.fetch = deps.fetch ?? fetch;
    this.sleep = deps.sleep ?? defaultSleep;
    this.now = deps.now ?? Date.now;
  }

  /* ---------------- auth ---------------- */

  async guid(): Promise<string> {
    if (this.config.guid) return this.config.guid;
    const { username, password } = this.config;
    if (!username || !password) {
      throw new FlatpayError("Flatpay er ikke sat op (mangler FLATPAY_GUID eller brugernavn og adgangskode)", 0, "not_configured");
    }
    const key = `${this.config.baseUrl}|${username}`;
    if (cachedGuid?.key === key) return cachedGuid.guid;
    const guid = await this.login(username, password);
    cachedGuid = { key, guid };
    return guid;
  }

  /** POST /socket/guid. Returns the partner token. */
  async login(username: string, password: string): Promise<string> {
    const res = await this.request("POST", "/socket/guid", { body: { username, password } });
    const text = (await res.text()).trim();
    let guid = text;
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "string") guid = parsed;
      else if (parsed && typeof parsed === "object" && typeof (parsed as { guid?: unknown }).guid === "string") {
        guid = (parsed as { guid: string }).guid;
      }
    } catch {
      /* plain text body */
    }
    if (!guid) throw new FlatpayError("Flatpay gav ingen adgangsnøgle", res.status);
    return guid;
  }

  /** When the stored GUID is rejected, forget it so the next call logs in again. */
  private forgetGuid() {
    if (!this.config.guid) cachedGuid = null;
  }

  /* ---------------- endpoints ---------------- */

  async terminals(): Promise<unknown> {
    const guid = await this.guid();
    return (await this.request("GET", "/socket/terminals", { query: { guid } })).json();
  }

  async isConnected(terminalId: string): Promise<boolean> {
    const guid = await this.guid();
    const res = await this.request("GET", "/socket/terminal/connection", { query: { terminalId, guid } });
    const body = (await res.json()) as { isTerminalConnected?: boolean };
    return body.isTerminalConnected === true;
  }

  /** POST /socket/transaction/start. Returns the canonical transactionReference and the status Flatpay reports. */
  async start(input: {
    terminalId: string;
    type: FlatpayTransactionType;
    amountOere: number;
    transactionReference: string;
    externalReference: string;
  }): Promise<{ transactionReference: string; status?: FlatpayStatus }> {
    const guid = await this.guid();
    const res = await this.request("POST", "/socket/transaction/start", {
      body: {
        guid,
        terminalId: input.terminalId,
        transactionType: input.type,
        amount: String(input.amountOere),
        language: "da_DK",
        reference: "PhoneSpot",
        externalReference: input.externalReference.slice(0, 64),
        transactionReference: input.transactionReference,
      },
    });
    const body = (await res.json().catch(() => ({}))) as { transactionReference?: string; status?: FlatpayStatus };
    return { transactionReference: body.transactionReference || input.transactionReference, status: body.status };
  }

  /** GET /socket/transaction/response. null = Flatpay has no such transaction (404). */
  async transaction(transactionReference: string, terminalId: string): Promise<FlatpayTransaction | null> {
    const guid = await this.guid();
    try {
      const res = await this.request("GET", "/socket/transaction/response", {
        query: { transactionReference, guid, terminalId },
      });
      return (await res.json()) as FlatpayTransaction;
    } catch (err) {
      if (err instanceof FlatpayError && err.status === 404) return null;
      throw err;
    }
  }

  /** POST /socket/transaction/cancel. Returns the latest transaction state when Flatpay sends it. */
  async cancel(transactionReference: string, terminalId: string): Promise<FlatpayTransaction | null> {
    const guid = await this.guid();
    const res = await this.request("POST", "/socket/transaction/cancel", {
      body: { transactionReference, terminalId, guid },
    });
    return ((await res.json().catch(() => null)) as FlatpayTransaction | null) ?? null;
  }

  /* ---------------- transport ---------------- */

  private async request(
    method: "GET" | "POST",
    path: string,
    opts: { query?: Record<string, string>; body?: unknown },
  ): Promise<Response> {
    const url = new URL(this.config.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
    let res: Response;
    try {
      res = await this.fetch(url.toString(), {
        method,
        headers: { Accept: "application/json", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (err) {
      // Never include the URL: it carries the GUID.
      console.error(`[flatpay] ${method} ${path} failed:`, err instanceof Error ? err.name : "error");
      throw new FlatpayError("Kunne ikke få forbindelse til Flatpay", 0, "network");
    }
    if (res.ok) return res;
    if (res.status === 401) this.forgetGuid();
    const err = (await res.json().catch(() => null)) as { message?: string; developerCode?: string; traceId?: string } | null;
    console.error(`[flatpay] ${method} ${path} -> ${res.status}`, {
      developerCode: err?.developerCode,
      traceId: err?.traceId,
    });
    throw new FlatpayError(err?.message || `Flatpay svarede ${res.status}`, res.status, err?.developerCode);
  }
}
