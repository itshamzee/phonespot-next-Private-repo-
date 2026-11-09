// Link til Green.dk så ekspedienten kan sammenligne en pris på disken:
// en Google-søgning begrænset til green.dk.
export function greenUrl(brand: string, model: string, storage?: string): string {
  const terms = [brand, model, storage].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(`site:green.dk ${terms}`)}`;
}
