// Diagnostik er ikke en reparation og må ikke blive sidens "fra"-pris
// (ellers står der "Samsung-reparation fra 248 kr." for en fejlsøgning).
export function countsTowardFromPrice(s: {
  price_dkk: number;
  service_category?: string | null;
  name?: string | null;
}): boolean {
  if (!(s.price_dkk > 0)) return false;
  const label = `${s.service_category ?? ""} ${s.name ?? ""}`;
  return !/diagnos/i.test(label);
}
