export type LocationLite = { id: string; name: string; slug: string | null };

/** Butikken der matcher slug præcist (aldrig delvis: "vejle" er ikke "vejle-gaagade"). */
export function exactSlugMatch<T extends LocationLite>(locations: T[], wanted: string | null | undefined): T | null {
  if (!wanted) return null;
  return locations.find((l) => l.slug === wanted) ?? null;
}

/**
 * Standardbutik når intet scope peger på en bestemt butik (ejer med "alle"):
 * en butik med åben kasse, ellers Vejle, ellers den første.
 */
export function fallbackLocation<T extends LocationLite>(locations: T[], openSessionIds: ReadonlySet<string>): T {
  return locations.find((l) => openSessionIds.has(l.id)) ?? locations.find((l) => l.slug === "vejle") ?? locations[0];
}
