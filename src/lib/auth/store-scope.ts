/**
 * Butiksafgrænsning (store scope) — rene hjælpere uden I/O, så de kan bruges i
 * både server, klient og tests.
 *
 * Model:
 *  - `locations` er kilden til sandhed (uuid). `locations.slug` er den stabile
 *    nøgle: 'vejle' | 'slagelse' | 'webshop'.
 *  - De fysiske tekst-kolonner (`repair_tickets.store_id` m.fl.) bruger kun
 *    'vejle' | 'slagelse' (src/lib/stores.ts) og NULL for "generel".
 *  - Ejeren (role 'owner') er den ENESTE super-admin: ser alt eller vælger én
 *    butik. Alle andre hører til præcis én butik og kan aldrig se andre.
 *
 * Server-siden (opslag i databasen, cookie, request) ligger i
 * store-scope-server.ts.
 */

export type ScopeSlug = "vejle" | "slagelse" | "webshop";

/** "alle" = ejerens samlede overblik, "ingen" = medarbejder uden tildelt butik (fail closed). */
export type StoreScope = ScopeSlug | "alle" | "ingen";

export const SCOPE_SLUGS: readonly ScopeSlug[] = ["vejle", "slagelse", "webshop"];

/** Cookie der husker ejerens valg i topbjælken. Ikke httpOnly: klienten skriver den, serveren læser den. */
export const STORE_SCOPE_COOKIE = "ps_store";

export const SCOPE_LABELS: Record<ScopeSlug | "alle" | "ingen", string> = {
  alle: "Alle",
  vejle: "Vejle",
  slagelse: "Slagelse",
  webshop: "Webshop",
  ingen: "Ingen butik",
};

/** Minimum af en medarbejder, som scope-reglerne har brug for. */
export type ScopedStaff = {
  role: string;
  location_slug: string | null;
};

export function isScopeSlug(v: unknown): v is ScopeSlug {
  return typeof v === "string" && (SCOPE_SLUGS as readonly string[]).includes(v);
}

/** "Vejle " -> "vejle"; alt ukendt -> null. */
export function normalizeScopeSlug(v: unknown): ScopeSlug | null {
  if (typeof v !== "string") return null;
  const slug = v.trim().toLowerCase();
  return isScopeSlug(slug) ? slug : null;
}

/** Validerer en ønsket scope-værdi (cookie, query). "alle" eller et slug; ellers null. */
export function parseRequestedScope(v: unknown): ScopeSlug | "alle" | null {
  if (typeof v !== "string") return null;
  const value = v.trim().toLowerCase();
  if (value === "alle") return "alle";
  return isScopeSlug(value) ? value : null;
}

export function isOwner(staff: Pick<ScopedStaff, "role"> | null | undefined): boolean {
  return staff?.role === "owner";
}

/** Medarbejderens egen butik som slug, eller null hvis ingen er tildelt. */
export function staffStoreSlug(staff: ScopedStaff): ScopeSlug | null {
  return normalizeScopeSlug(staff.location_slug);
}

/**
 * Hvilken afgrænsning gælder for denne medarbejder?
 *  - ejer: det ønskede slug eller 'alle' (standard 'alle')
 *  - alle andre: ALTID egen butik; ønsker om andre butikker ignoreres.
 *    Uden tildelt butik: 'ingen' (ser ingenting).
 */
export function getStoreScope(staff: ScopedStaff, requestedSlug?: string | null): StoreScope {
  if (isOwner(staff)) return parseRequestedScope(requestedSlug) ?? "alle";
  return staffStoreSlug(staff) ?? "ingen";
}

/** Må medarbejderen røre en række der hører til `rowStore` (null = generel/ukendt butik)? */
export function canAccessStore(staff: ScopedStaff, rowStore: string | null | undefined): boolean {
  if (isOwner(staff)) return true;
  const own = staffStoreSlug(staff);
  if (!own) return false;
  const row = normalizeScopeSlug(rowStore ?? null);
  // Webshop-medarbejdere har også de rækker, der ikke er knyttet til en fysisk butik.
  if (own === "webshop") return row === null || row === "webshop";
  return row === own;
}

export class StoreAccessError extends Error {
  readonly status = 403;
  constructor(message = "Du har ikke adgang til denne butik.") {
    super(message);
    this.name = "StoreAccessError";
  }
}

/** Til mutationer: kaster StoreAccessError hvis medarbejderen ikke må røre en række i `slug`. */
export function assertStoreAccess(staff: ScopedStaff, slug: string | null | undefined): void {
  if (!canAccessStore(staff, slug)) throw new StoreAccessError();
}

/**
 * Hvilken butik skal en NY række (indlevering, henvendelse m.m.) have?
 * Ejeren vælger selv (`requested`), men skal vælge en fysisk butik når
 * scopet er 'alle'/'webshop'. Andre får altid deres egen. Returnerer null
 * hvis der ikke kan vælges nogen — kalderen svarer da 400/403.
 */
export function storeForNewRecord(
  staff: ScopedStaff,
  scope: StoreScope,
  requested?: string | null,
): "vejle" | "slagelse" | null {
  const physical = (v: unknown): "vejle" | "slagelse" | null => {
    const slug = normalizeScopeSlug(v);
    return slug === "vejle" || slug === "slagelse" ? slug : null;
  };
  if (isOwner(staff)) return physical(requested) ?? physical(scope);
  return physical(staffStoreSlug(staff));
}

/* ------------------------------------------------------------------ */
/*  Oversættelse mellem locations-uuid og slug                         */
/* ------------------------------------------------------------------ */

export type LocationRow = {
  id: string;
  name?: string | null;
  type?: string | null;
  slug?: string | null;
};

/** Slug for en location-række. Før migrationen er kørt findes `slug` ikke; så udledes den af type/navn. */
export function deriveLocationSlug(row: LocationRow): ScopeSlug | null {
  const direct = normalizeScopeSlug(row.slug ?? null);
  if (direct) return direct;
  if (row.type === "online") return "webshop";
  const name = (row.name ?? "").trim().toLowerCase();
  if (name === "vejle" || name === "slagelse") return name;
  if (name === "webshop" || name === "online") return "webshop";
  return null;
}

export type LocationIndex = {
  idBySlug: Partial<Record<ScopeSlug, string>>;
  slugById: Record<string, ScopeSlug>;
};

export function buildLocationIndex(rows: LocationRow[]): LocationIndex {
  const idBySlug: LocationIndex["idBySlug"] = {};
  const slugById: LocationIndex["slugById"] = {};
  for (const row of rows) {
    const slug = deriveLocationSlug(row);
    if (!slug) continue;
    if (!idBySlug[slug]) idBySlug[slug] = row.id; // første række vinder, som i migrationen
    slugById[row.id] = slug;
  }
  return { idBySlug, slugById };
}

export function locationIdForSlug(index: LocationIndex, slug: string | null | undefined): string | null {
  const s = normalizeScopeSlug(slug ?? null);
  return s ? (index.idBySlug[s] ?? null) : null;
}

export function slugForLocationId(index: LocationIndex, id: string | null | undefined): ScopeSlug | null {
  return id ? (index.slugById[id] ?? null) : null;
}
