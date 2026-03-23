// src/lib/tilbehoer-filter-config.ts
// Category-specific filter definitions for the tilbehoer sidebar

export interface SubFilter {
  key: string;
  label: string;
  type: "links" | "checkboxes";
  options: { value: string; label: string }[];
  dependsOn?: string;
}

export interface CategoryFilterConfig {
  slug: string;
  filters: SubFilter[];
}

export const TYPE_KEYWORDS: Record<string, string[]> = {
  "usb-c": ["USB-C", "USB C"],
  lightning: ["Lightning"],
  traadloes: ["Trådløs", "Wireless", "Qi"],
  magsafe: ["MagSafe"],
  earbuds: ["Earbuds", "In-ear", "In-Ear"],
  "over-ear": ["Over-ear", "Headset", "Headphone"],
  hoejttalere: ["Højttaler", "Speaker", "Bluetooth Speaker"],
  bil: ["Bilholder", "Car Mount", "Car Holder"],
  skrivebord: ["Stander", "Stand", "Desk"],
};

export const PRICE_RANGES = [
  { value: "0-9999", label: "Under 100 kr", min: 0, max: 9999 },
  { value: "10000-29999", label: "100\u2013299 kr", min: 10000, max: 29999 },
  { value: "30000-49999", label: "300\u2013499 kr", min: 30000, max: 49999 },
  { value: "50000-999999", label: "500+ kr", min: 50000, max: 999999 },
];

export const CATEGORY_FILTERS: CategoryFilterConfig[] = [
  {
    slug: "covers",
    filters: [
      {
        key: "case_type",
        label: "Cover type",
        type: "links",
        options: [
          { value: "Wallet", label: "Wallet" },
          { value: "Book", label: "Book" },
          { value: "Slim", label: "Slim" },
          { value: "Clear", label: "Clear" },
          { value: "Rugged", label: "Rugged" },
          { value: "Flip", label: "Flip" },
          { value: "Bumper", label: "Bumper" },
        ],
      },
    ],
  },
  {
    slug: "skaermbeskyttelse",
    filters: [
      {
        key: "protector_type",
        label: "Type",
        type: "links",
        options: [
          { value: "H\u00E6rdet glas", label: "Panserglas" },
          { value: "Film", label: "Beskyttelsesfilm" },
          { value: "Privacy", label: "Privacy glas" },
          { value: "Edge to Edge", label: "Edge to Edge" },
        ],
      },
    ],
  },
  {
    slug: "opladere",
    filters: [
      {
        key: "type",
        label: "Type",
        type: "links",
        options: [
          { value: "usb-c", label: "USB-C" },
          { value: "lightning", label: "Lightning" },
          { value: "traadloes", label: "Trådløs opladning" },
          { value: "magsafe", label: "MagSafe" },
        ],
      },
    ],
  },
  {
    slug: "lyd",
    filters: [
      {
        key: "type",
        label: "Type",
        type: "links",
        options: [
          { value: "earbuds", label: "Earbuds & In-ear" },
          { value: "over-ear", label: "Over-ear & Headset" },
          { value: "hoejttalere", label: "Højttalere" },
        ],
      },
    ],
  },
  {
    slug: "holdere",
    filters: [
      {
        key: "type",
        label: "Type",
        type: "links",
        options: [
          { value: "bil", label: "Bilholdere" },
          { value: "skrivebord", label: "Skrivebordsstander" },
          { value: "magsafe", label: "MagSafe mounts" },
        ],
      },
    ],
  },
];

export function getCategoryFilters(slug: string): CategoryFilterConfig | null {
  return CATEGORY_FILTERS.find((c) => c.slug === slug) ?? null;
}
