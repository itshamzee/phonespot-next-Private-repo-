import "server-only";
import type { ApiError, ApiErrorCode, BalancesResponse, Location, MovementInput, MovementResult, Part } from "./api-types";
import { getLagersystemConfig, type LagersystemConfig } from "./config";

export type ClientErrorCode = ApiErrorCode | "network" | "timeout" | "bad_response";

export class LagersystemError extends Error {
  constructor(public readonly status: number, public readonly code: ClientErrorCode, message: string) {
    super(message);
    this.name = "LagersystemError";
  }
  /** Netværk, timeout, 408, 429 og 5xx prøves igen; alt andet (401/403/404/400/409) er endeligt. */
  get retryable(): boolean {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export function createLagersystemClient(config: LagersystemConfig, fetchImpl: typeof fetch = fetch, timeoutMs = 10_000) {
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${config.url}/api/v1${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      throw new LagersystemError(0, timedOut ? "timeout" : "network", timedOut ? "Lagersystemet svarede ikke i tide" : "Kunne ikke forbinde til lagersystemet");
    }
    let body: unknown = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok) {
      const e = (body as ApiError | null)?.error;
      throw new LagersystemError(res.status, e?.code ?? (res.status >= 500 ? "internal" : "bad_response"), e?.message ?? `HTTP ${res.status}`);
    }
    if (body === null) throw new LagersystemError(res.status, "bad_response", "Tomt svar fra lagersystemet");
    return body as T;
  }

  return {
    async searchParts(q: string, limit = 20): Promise<Part[]> {
      const params = new URLSearchParams({ q, limit: String(Math.min(50, Math.max(1, Math.trunc(limit)))) });
      return (await call<{ parts: Part[] }>(`/parts?${params}`)).parts;
    },
    async getPart(sharedSku: string): Promise<Part> {
      return (await call<{ part: Part }>(`/parts/${encodeURIComponent(sharedSku)}`)).part;
    },
    async listLocations(): Promise<Location[]> {
      return (await call<{ locations: Location[] }>("/locations")).locations;
    },
    async getBalances(location: string, sharedSku?: string): Promise<BalancesResponse> {
      const params = new URLSearchParams({ location });
      if (sharedSku) params.set("sku", sharedSku);
      return call<BalancesResponse>(`/balances?${params}`);
    },
    async postMovement(input: MovementInput): Promise<MovementResult> {
      return call<MovementResult>("/movements", { method: "POST", body: JSON.stringify(input) });
    },
  };
}

export type LagersystemClient = ReturnType<typeof createLagersystemClient>;

export function getLagersystemClient(): LagersystemClient | null {
  const config = getLagersystemConfig();
  return config ? createLagersystemClient(config) : null;
}

/** Dansk tekst til admin-UI. Rå fejl logges, men vises ikke. */
export function describeLagersystemError(err: unknown): string {
  if (!(err instanceof LagersystemError)) return "Der skete en uventet fejl. Prøv igen.";
  switch (err.code) {
    case "unauthorized": return "Lagersystemet afviste PhoneSpots nøgle. Kontakt administrator.";
    case "forbidden_location": return "PhoneSpot må ikke bogføre på denne lokation.";
    case "unknown_part": return "Delen findes ikke i kataloget.";
    case "unknown_location": return "Lokationen findes ikke i lagersystemet.";
    case "invalid_body": return `Lagersystemet afviste data: ${err.message}`;
    case "idempotency_conflict": return "Handlingen er allerede bogført med andre værdier. Genindlæs siden og prøv igen.";
    case "invalid_state": return "Flytningen har ændret status. Genindlæs siden og prøv igen.";
    case "unknown_transfer": return "Flytningen findes ikke.";
    default: return err.retryable ? "Lagersystemet svarer ikke lige nu. Prøv igen om lidt." : "Lagersystemet afviste forespørgslen.";
  }
}
