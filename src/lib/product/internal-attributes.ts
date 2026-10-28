/**
 * Attributter der kun bruges internt (import, lagerrydning, AI-optagelse) og
 * aldrig må vises som specifikation på produktsiden. ai_read_text kan fx
 * indeholde rå tekst fra en pakke, prismærker eller beskyttede varemærker.
 */
const INTERNAL_ATTRIBUTE_KEYS = new Set([
  "_source",
  "source",
  "id",
  "cost_price",
  "supplier_id",
  "udsalg",
  "genuine",
  "ai_read_text",
]);

export function isPublicAttribute(key: string): boolean {
  return !INTERNAL_ATTRIBUTE_KEYS.has(key);
}
