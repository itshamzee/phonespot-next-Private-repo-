// src/lib/product-color-siblings.ts
// Auto-detect color variants by matching product titles that differ only by color word.
// Used to show color swatches linking between related products on the product detail page.

// Common color words found in Foneday product titles (English + Danish)
const COLOR_WORDS = new Set([
  // English
  "black", "white", "red", "blue", "green", "yellow", "pink", "purple",
  "orange", "brown", "grey", "gray", "silver", "gold", "rose", "navy",
  "beige", "coral", "mint", "teal", "ivory", "cream", "transparent",
  "clear", "dark", "light", "midnight", "space",
  // Danish
  "sort", "hvid", "roed", "blaa", "groen", "gul", "rosa", "lilla",
  "brun", "graa", "soelv", "guld",
  // Common compound colors
  "rosegold", "rose-gold", "space-gray", "space-grey",
  "midnight-blue", "dark-blue", "light-blue", "dark-green",
]);

// Map color words to display-friendly labels (with proper Danish chars)
const COLOR_LABELS: Record<string, string> = {
  black: "Sort",
  white: "Hvid",
  red: "R\u00F8d",
  blue: "Bl\u00E5",
  green: "Gr\u00F8n",
  yellow: "Gul",
  pink: "Pink",
  purple: "Lilla",
  orange: "Orange",
  brown: "Brun",
  grey: "Gr\u00E5",
  gray: "Gr\u00E5",
  silver: "S\u00F8lv",
  gold: "Guld",
  rose: "Rose",
  navy: "Navy",
  beige: "Beige",
  coral: "Koral",
  mint: "Mint",
  teal: "Teal",
  transparent: "Transparent",
  clear: "Klar",
  midnight: "Midnight",
  // Danish passthrough
  sort: "Sort",
  hvid: "Hvid",
  brun: "Brun",
  graa: "Gr\u00E5",
  soelv: "S\u00F8lv",
  guld: "Guld",
  rosa: "Rosa",
  lilla: "Lilla",
  roed: "R\u00F8d",
  blaa: "Bl\u00E5",
  groen: "Gr\u00F8n",
  gul: "Gul",
};

// CSS-safe color values for swatch dots
const COLOR_CSS: Record<string, string> = {
  black: "#111111",
  sort: "#111111",
  white: "#FFFFFF",
  hvid: "#FFFFFF",
  red: "#DC2626",
  roed: "#DC2626",
  blue: "#2563EB",
  blaa: "#2563EB",
  green: "#16A34A",
  groen: "#16A34A",
  yellow: "#EAB308",
  gul: "#EAB308",
  pink: "#EC4899",
  rosa: "#EC4899",
  purple: "#9333EA",
  lilla: "#9333EA",
  orange: "#EA580C",
  brown: "#92400E",
  brun: "#92400E",
  grey: "#6B7280",
  gray: "#6B7280",
  graa: "#6B7280",
  silver: "#C0C0C0",
  soelv: "#C0C0C0",
  gold: "#D4A843",
  guld: "#D4A843",
  rose: "#F9A8D4",
  navy: "#1E3A5F",
  beige: "#D4C5A9",
  coral: "#F87171",
  mint: "#6EE7B7",
  teal: "#14B8A6",
  transparent: "transparent",
  clear: "transparent",
  midnight: "#1E293B",
};

export interface ColorSibling {
  id: string;
  title: string;
  slug: string;
  color: string;       // raw color word extracted from title
  colorLabel: string;   // display label (Danish)
  colorCss: string;     // CSS color value for swatch
  image: string | null; // first product image
  isCurrent: boolean;   // true if this is the product being viewed
}

/**
 * Extract the color word from the end of a product title.
 * Returns the color word and the base title (title without color).
 *
 * "NOVANL BookMate Case For iPhone 16 Pro Max Brown"
 *  → { color: "brown", baseTitle: "NOVANL BookMate Case For iPhone 16 Pro Max" }
 *
 * "Samsung Galaxy S24 Ultra Clear Case"
 *  → { color: "clear", baseTitle: "Samsung Galaxy S24 Ultra Case" }
 */
export function extractColor(title: string): { color: string; baseTitle: string } | null {
  const words = title.trim().split(/\s+/);
  if (words.length < 3) return null;

  // Check last word
  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z\u00E6\u00F8\u00E5-]/g, "");
  if (COLOR_WORDS.has(lastWord)) {
    return {
      color: lastWord,
      baseTitle: words.slice(0, -1).join(" "),
    };
  }

  // Check second-to-last word (e.g. "Clear Case" → color is "Clear")
  if (words.length >= 4) {
    const secondLast = words[words.length - 2].toLowerCase().replace(/[^a-z\u00E6\u00F8\u00E5-]/g, "");
    if (COLOR_WORDS.has(secondLast)) {
      const remaining = [...words.slice(0, -2), words[words.length - 1]];
      return {
        color: secondLast,
        baseTitle: remaining.join(" "),
      };
    }
  }

  return null;
}

/**
 * Get the display label for a color word.
 */
export function getColorLabel(color: string): string {
  return COLOR_LABELS[color.toLowerCase()] ?? color.charAt(0).toUpperCase() + color.slice(1);
}

/**
 * Get the CSS color value for a swatch dot.
 */
export function getColorCss(color: string): string {
  return COLOR_CSS[color.toLowerCase()] ?? "#6B7280";
}
