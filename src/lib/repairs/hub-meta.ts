/** Vælger den længste variant, der holder sig inden for tegngrænsen. */
export function fitTitle(variants: string[], max = 60): string {
  return variants.find((v) => v.length <= max) ?? variants[variants.length - 1];
}
