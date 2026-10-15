/**
 * Kronebeløb som personalet skriver dem ("999", "999,50", "1.299,50") til øre.
 * Returnerer null for alt der ikke er et gyldigt, ikke-negativt beløb med højst 2 decimaler.
 */
export function parseKrToOere(input: string): number | null {
  let s = input.replace(/\s|kr\.?/gi, "");
  if (!s) return null;
  if (s.includes(",")) {
    // Komma er decimaltegn; punktummer er tusindtalsadskillere.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const oere = Math.round(Number(s) * 100);
  return Number.isSafeInteger(oere) && oere <= 100_000_000 ? oere : null;
}

/** Øre til tekst i et prisfelt: 99900 -> "999", 99950 -> "999,50". */
export function oereToInput(oere: number): string {
  const kr = Math.floor(oere / 100);
  const rest = oere % 100;
  return rest === 0 ? String(kr) : `${kr},${String(rest).padStart(2, "0")}`;
}

/** Hurtigvalg til begrundelsen når prisen afviger fra listeprisen. */
export const PRICE_REASON_CHIPS = ["Aftalt pris med kunden", "Kulance", "Fejl i listepris"] as const;

/** Hurtigvalg når en linje fjernes. */
export const REMOVE_REASON_CHIPS = ["Tilføjet ved en fejl", "Kunden ville ikke have den", "Aftalt med kunden"] as const;
