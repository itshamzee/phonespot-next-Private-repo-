/**
 * Butiks-tilhør (store attribution) — delte hjælpere.
 *
 * Slugs matcher `STORES` i src/lib/store-config.ts og `reservations.store_id`.
 * NULL betyder generel/ukendt henvendelse uden butiks-tilhør.
 */

export type StoreId = "slagelse" | "vejle";

export const STORE_IDS: StoreId[] = ["slagelse", "vejle"];

export function isStoreId(v: unknown): v is StoreId {
  return typeof v === "string" && (STORE_IDS as string[]).includes(v);
}

/**
 * Normaliserer vilkårligt input til et gyldigt store-slug eller null.
 * "Vejle" / " vejle " -> "vejle"; alt andet (ukendt streng, tal, null, …) -> null.
 */
export function normalizeStoreId(v: unknown): StoreId | null {
  if (typeof v !== "string") return null;
  const slug = v.trim().toLowerCase();
  return isStoreId(slug) ? slug : null;
}

/** Menneskelæsbar label til admin-UI m.m. */
export function storeLabel(v: StoreId | null): string {
  switch (v) {
    case "slagelse":
      return "Slagelse";
    case "vejle":
      return "Vejle";
    default:
      return "Generel";
  }
}
