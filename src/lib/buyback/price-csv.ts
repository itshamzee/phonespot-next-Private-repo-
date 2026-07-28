export interface ParsedPriceRow {
  deviceType: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  basePriceOre: number;
}

// Admin pastes rows straight out of a spreadsheet, so tabs and commas both count
// as separators, and prices arrive in Danish notation (2.500 or 2500,50).
// Note: in comma-separated input a decimal comma is indistinguishable from a
// column break, so decimals only survive in tab-separated paste. Base prices are
// whole kroner in practice, so this costs nothing.
function parseKronerToOre(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const kroner = Number(cleaned);
  if (!Number.isFinite(kroner) || kroner < 0) return null;
  return Math.round(kroner * 100);
}

export function parsePriceCsv(text: string): { rows: ParsedPriceRow[]; errors: string[] } {
  const rows: ParsedPriceRow[] = [];
  const errors: string[] = [];

  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;

    const columns = (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());

    if (columns.length < 5) {
      errors.push(`Linje ${index + 1}: mangler kolonner (type, mærke, model, lager, pris)`);
      return;
    }

    const [deviceType, brand, model, storage, price, ram] = columns;

    if (!deviceType || !brand || !model) {
      errors.push(`Linje ${index + 1}: type, mærke og model skal udfyldes`);
      return;
    }

    const basePriceOre = parseKronerToOre(price ?? "");
    if (basePriceOre === null) {
      errors.push(`Linje ${index + 1}: "${price}" er ikke en gyldig pris`);
      return;
    }

    rows.push({
      deviceType,
      brand,
      model,
      storage: storage ?? "",
      ram: ram ?? "",
      basePriceOre,
    });
  });

  return { rows, errors };
}
