/**
 * CVR-opslag via cvrapi.dk (valgfrit, bag en knap i Ny sag). Resultatet caches på kunden
 * (customers.cvr_lookup / cvr_lookup_at), så samme CVR ikke slås op igen i 30 dage.
 * cvrapi.dk kræver en sigende User-Agent.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CvrLookupResponse } from "@/lib/repairs/new-case-types";

export const CVR_USER_AGENT = "PhoneSpot admin (phonespot.dk)";
export const CVR_CACHE_MS = 30 * 24 * 60 * 60 * 1000;

/** "DK 1234 5678" -> "12345678"; ugyldigt -> null. */
export function normalizeCvr(input: string | null | undefined): string | null {
  const digits = (input ?? "").toUpperCase().replace(/^DK/, "").replace(/\D/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export type CvrApiPayload = {
  name?: string;
  address?: string;
  zipcode?: string | number;
  city?: string;
  error?: string;
};

export function shapeCvr(cvr: string, p: CvrApiPayload, cached: boolean): CvrLookupResponse | null {
  if (!p.name) return null;
  return {
    cvr,
    company_name: p.name,
    address: p.address ?? null,
    zip: p.zipcode != null ? String(p.zipcode) : null,
    city: p.city ?? null,
    cached,
  };
}

export class CvrError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function lookupCvr(
  cvr: string,
  db: SupabaseClient,
  opts: { customerId?: string | null; fetchImpl?: typeof fetch; now?: number } = {},
): Promise<CvrLookupResponse> {
  const now = opts.now ?? Date.now();

  // Cache: en kunde med samme CVR og et friskt opslag.
  const { data: cachedRows } = await db
    .from("customers")
    .select("id, cvr_lookup, cvr_lookup_at")
    .eq("cvr", cvr)
    .not("cvr_lookup", "is", null)
    .order("cvr_lookup_at", { ascending: false })
    .limit(1);
  const hit = (cachedRows ?? [])[0] as { cvr_lookup: CvrApiPayload; cvr_lookup_at: string | null } | undefined;
  if (hit?.cvr_lookup_at && now - Date.parse(hit.cvr_lookup_at) < CVR_CACHE_MS) {
    const shaped = shapeCvr(cvr, hit.cvr_lookup, true);
    if (shaped) return shaped;
  }

  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`https://cvrapi.dk/api?search=${cvr}&country=dk`, {
      headers: { "User-Agent": CVR_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    throw new CvrError(502, "CVR-opslaget svarer ikke lige nu. Skriv firmaoplysningerne selv.");
  }
  if (res.status === 429) throw new CvrError(429, "For mange CVR-opslag lige nu. Prøv igen om lidt.");
  const body = (await res.json().catch(() => ({}))) as CvrApiPayload;
  if (res.status === 404 || body.error === "NOT_FOUND") throw new CvrError(404, "Intet firma fundet med det CVR-nummer");
  if (res.status === 429 || body.error === "QUOTA_EXCEEDED") throw new CvrError(429, "For mange CVR-opslag lige nu. Prøv igen om lidt.");
  if (!res.ok) throw new CvrError(502, "CVR-opslaget fejlede. Skriv firmaoplysningerne selv.");
  const shaped = shapeCvr(cvr, body, false);
  if (!shaped) throw new CvrError(404, "Intet firma fundet med det CVR-nummer");

  if (opts.customerId) {
    await db
      .from("customers")
      .update({ cvr_lookup: body, cvr_lookup_at: new Date(now).toISOString() })
      .eq("id", opts.customerId);
  }
  return shaped;
}
