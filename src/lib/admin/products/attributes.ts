/**
 * Fælles definition af tilbehørskategorier og deres attributter.
 *
 * Kundesiden filtrerer på `attributes->>case_type` og `attributes->>protector_type`
 * med præcis disse værdier (se src/lib/tilbehoer-filter-config.ts), så listen her
 * er den eneste sandhed for hvad admin må skrive i `sku_products.attributes`.
 */

export interface AttributeField {
  key: string;
  label: string;
  type: "select" | "text";
  options?: string[];
}

export interface AccessorySubcategory {
  value: string;
  label: string;
  /** Kort forklaring til opret-flowet. */
  hint: string;
}

export const ACCESSORY_SUBCATEGORIES: AccessorySubcategory[] = [
  { value: "cover", label: "Cover", hint: "Covers, etuier og bumpere" },
  { value: "screen_protector", label: "Beskyttelsesglas", hint: "Hærdet glas, film og privacy" },
  { value: "charger", label: "Oplader", hint: "Væg-, bil- og trådløse opladere" },
  { value: "cable", label: "Kabel", hint: "USB-C, Lightning og adaptere" },
  { value: "audio", label: "Lyd", hint: "Høretelefoner og højttalere" },
  { value: "powerbank", label: "Powerbank", hint: "Batteripakker" },
  { value: "other", label: "Holdere og andet", hint: "Holdere, standere og øvrigt" },
];

export const TYPE_ATTRIBUTES: Record<string, AttributeField[]> = {
  cover: [
    { key: "case_type", label: "Covertype", type: "select", options: ["Wallet", "Slim", "Rugged", "Clear", "Flip", "Bumper", "Book"] },
  ],
  screen_protector: [
    { key: "protector_type", label: "Type", type: "select", options: ["Hærdet glas", "Film", "Privacy", "Edge to Edge"] },
  ],
  cable: [
    { key: "connector_type", label: "Stik", type: "select", options: ["USB-C", "Lightning", "Micro-USB", "USB-A", "USB-C til Lightning", "USB-C til USB-C"] },
    { key: "length", label: "Længde", type: "select", options: ["0.5m", "1m", "1.5m", "2m", "3m"] },
  ],
  charger: [
    { key: "charger_type", label: "Type", type: "select", options: ["Vægoplader", "Biloplader", "Trådløs", "MagSafe"] },
    { key: "watt", label: "Watt", type: "text" },
  ],
  powerbank: [
    { key: "capacity", label: "Kapacitet (mAh)", type: "text" },
    { key: "watt", label: "Watt", type: "text" },
  ],
  audio: [
    { key: "audio_type", label: "Type", type: "select", options: ["In-ear", "Over-ear", "On-ear", "Højttaler", "AUX-kabel"] },
    { key: "wireless", label: "Trådløs", type: "select", options: ["Ja", "Nej"] },
  ],
  other: [],
};

/** Kategorier hvor et produkt typisk passer til én bestemt model (og derfor oprettes pr. model). */
export const MODEL_SPECIFIC_SUBCATEGORIES = new Set(["cover", "screen_protector"]);
