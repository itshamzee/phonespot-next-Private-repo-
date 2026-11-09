// Link til Green.dk så ekspedienten kan sammenligne en pris på disken.
// Green.dks søge-URL-format er ikke verificeret, så vi gætter ikke på en
// forespørgselsparameter: linket peger på forsiden. Parametrene er med, så
// kaldere ikke skal ændres den dag formatet er bekræftet.
const GREEN_HOME = "https://www.green.dk/";

export function greenUrl(brand: string, model: string, storage?: string): string {
  void brand;
  void model;
  void storage;
  return GREEN_HOME;
}
