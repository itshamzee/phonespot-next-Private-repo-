export const COLLECTION_MAP: Record<string, { shopifyHandle: string; title: string }> = {
  iphones: { shopifyHandle: "iphones", title: "iPhones" },
  ipads: { shopifyHandle: "ipads", title: "iPads" },
  smartphones: { shopifyHandle: "smartphones", title: "Smartphones" },
  computere: { shopifyHandle: "computere", title: "Computere" },
  covers: { shopifyHandle: "covers", title: "Covers" },
  tilbehor: { shopifyHandle: "tilbehor", title: "Tilbehor" },
  reservedele: { shopifyHandle: "reservedele", title: "Reservedele" },
  outlet: { shopifyHandle: "outlet", title: "Outlet" },
};

export function getCollectionConfig(slug: string) {
  return COLLECTION_MAP[slug] ?? null;
}

export function getAllCollectionSlugs() {
  return Object.keys(COLLECTION_MAP);
}
