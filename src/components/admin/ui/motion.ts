/**
 * Varighederne fra app/admin-motion.css (--dur-press|fast|base|slow) i millisekunder, til
 * komponenter, der skal vente på en udtoning, før de afmonterer noget. Ét sted i koden;
 * vagten i app/(admin)/admin/__tests__/admin-motion-css.test.ts holder dem lig CSS'en.
 */
export const MOTION_MS = {
  press: 100,
  fast: 160,
  base: 220,
  slow: 320,
} as const;
