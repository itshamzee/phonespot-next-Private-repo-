/**
 * AI'ens titel og tekst nævner de modeller, den læste. Vælger praktikanten en
 * anden model, passer teksten ikke længere og skal erstattes af skabelonen.
 */
export function aiTextIsStale(aiModels: string[], models: string[]): boolean {
  const a = new Set(aiModels);
  return a.size !== new Set(models).size || models.some((m) => !a.has(m));
}
