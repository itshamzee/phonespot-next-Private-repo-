// "Fra"-prisen i titler, metabeskrivelser og hubs skal være en rigtig
// reparation (skærm, batteri eller anden hardware), ikke en fejlsøgning eller
// softwareydelse. Ellers står der fx "iPhone 15 reparation fra 499 kr." for
// "Software-fejl", mens det billigste skærmskift koster 1.599 kr.
const NOT_A_REPAIR =
  /diagnos|fejls[øo]g|software|gratis|tjek|unders[øo]g|r[åa]dgiv|data(overf|redning)|backup|ops[æa]tning|opdatering/i;

export function countsTowardFromPrice(s: {
  price_dkk: number;
  service_category?: string | null;
  name?: string | null;
  slug?: string | null;
}): boolean {
  if (!(s.price_dkk > 0)) return false;
  const label = `${s.service_category ?? ""} ${s.name ?? ""} ${s.slug ?? ""}`;
  return !NOT_A_REPAIR.test(label);
}
