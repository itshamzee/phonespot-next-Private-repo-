import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff, type StaffIdentity } from "@/lib/auth/require-staff";
import {
  STORE_SCOPE_COOKIE,
  StoreAccessError,
  buildLocationIndex,
  canAccessStore,
  getStoreScope,
  locationIdForSlug,
  slugForLocationId,
  type LocationIndex,
  type LocationRow,
  type ScopeSlug,
  type StoreScope,
} from "@/lib/auth/store-scope";

/**
 * Server-siden af butiksafgrænsningen: læs ejerens valg fra cookien, find
 * medarbejder + scope for en request, og slå locations-uuid op.
 * Importér herfra i route handlers og server components; rene regler ligger i
 * store-scope.ts.
 */

/* ---------------------- cookie og request ---------------------- */

/** Henter værdien af `ps_store` fra en rå Cookie-header. */
export function storeCookieFromHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    if (part.slice(0, eq).trim() !== STORE_SCOPE_COOKIE) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

/**
 * Scope for en request. Ejerens valg kommer fra cookien `ps_store` (eller et
 * eksplicit `?store=` på URL'en, som har forrang); for alle andre ignoreres
 * begge — scopet er deres egen butik.
 */
export function scopeForRequest(request: Request, staff: StaffIdentity): StoreScope {
  let requested: string | null = null;
  try {
    requested = new URL(request.url).searchParams.get("store");
  } catch {
    /* ugyldig URL — brug cookien */
  }
  requested ??= storeCookieFromHeader(request.headers.get("cookie"));
  return getStoreScope(staff, requested);
}

export type StaffWithScope = { staff: StaffIdentity; scope: StoreScope };

/** Personale + scope, eller null hvis ikke personale. Kalderen svarer 401. */
export async function requireStaffScope(request: NextRequest | Request): Promise<StaffWithScope | null> {
  const staff = await requireStaff(request);
  if (!staff) return null;
  return { staff, scope: scopeForRequest(request, staff) };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Log ind som personale for at bruge dette endpoint." }, { status: 401 });
}

export function forbiddenResponse(message = "Du har ikke adgang til denne butik.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Oversætter en StoreAccessError til 403; andre fejl kastes videre. */
export function handleScopeError(err: unknown) {
  if (err instanceof StoreAccessError) return forbiddenResponse(err.message);
  throw err;
}

/**
 * Må personalet røre en række i `rowStore`? Ruter svarer 404 (ikke 403) på
 * enkeltrækker i andre butikker, så man ikke kan sondere efter id'er.
 */
export function canSee(staff: StaffIdentity, rowStore: string | null | undefined): boolean {
  return canAccessStore(staff, rowStore);
}

/* ---------------------- query-afgrænsning ---------------------- */

type ScopableQuery<Q> = {
  eq(column: string, value: string): Q;
  is(column: string, value: null): Q;
  in(column: string, values: string[]): Q;
  or(filters: string): Q;
};

/**
 * Lægger butiksfilteret på en forespørgsel mod en tekst-kolonne som
 * `store_id` ('vejle' | 'slagelse' | NULL).
 *  - alle: ingen filtrering
 *  - vejle/slagelse: kun den butik
 *  - webshop: rækker uden fysisk butik (store_id IS NULL)
 *  - ingen: ingen rækker
 */
export function applyStoreScope<Q extends object>(builder: Q, scope: StoreScope, column = "store_id"): Q {
  // Bevidst løst typet: PostgREST-bygger-typerne er så dybe, at en struktureret generic får TS til at give op.
  const query = builder as unknown as ScopableQuery<Q>;
  switch (scope) {
    case "alle":
      return builder;
    case "webshop":
      return query.is(column, null);
    case "ingen":
      return query.in(column, []);
    default:
      return query.eq(column, scope);
  }
}

/**
 * Det samme for en uuid-kolonne mod `locations` (fx orders.location_id).
 * Webshop-ordrer har ingen eller den online lokation som location.
 */
export function applyLocationScope<Q extends object>(
  builder: Q,
  scope: StoreScope,
  index: LocationIndex,
  column = "location_id",
): Q {
  const query = builder as unknown as ScopableQuery<Q>;
  switch (scope) {
    case "alle":
      return builder;
    case "ingen":
      return query.in(column, []);
    case "webshop": {
      const webshopId = locationIdForSlug(index, "webshop");
      return webshopId ? query.or(`${column}.is.null,${column}.eq.${webshopId}`) : query.is(column, null);
    }
    default: {
      const id = locationIdForSlug(index, scope);
      return id ? query.eq(column, id) : query.in(column, []);
    }
  }
}

/* ---------------------- locations-opslag ---------------------- */

let cache: { at: number; index: LocationIndex } | null = null;
const CACHE_MS = 60_000;

export function resetLocationCache() {
  cache = null;
}

/** locations -> indeks. Virker også før migrationen (slug udledes), cachet i 60 sek. */
export async function loadLocationIndex(): Promise<LocationIndex> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.index;
  const supabase = createServerClient();
  let rows: LocationRow[] | null = null;
  const withSlug = await supabase.from("locations").select("id, name, type, slug");
  if (!withSlug.error) rows = withSlug.data as LocationRow[];
  else {
    const legacy = await supabase.from("locations").select("id, name, type");
    if (legacy.error) throw new Error(`locations lookup failed: ${legacy.error.message}`);
    rows = legacy.data as LocationRow[];
  }
  const index = buildLocationIndex(rows ?? []);
  cache = { at: Date.now(), index };
  return index;
}

export async function resolveLocationId(slug: string | null | undefined): Promise<string | null> {
  return locationIdForSlug(await loadLocationIndex(), slug);
}

export async function resolveLocationSlug(id: string | null | undefined): Promise<ScopeSlug | null> {
  return slugForLocationId(await loadLocationIndex(), id);
}
