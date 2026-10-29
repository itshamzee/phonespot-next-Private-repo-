export type ThreeForTwoLine = {
  key: string;
  unitPriceOere: number;
  quantity: number;
  lagersalg: boolean;
};

export type ThreeForTwoResult = {
  totalOere: number; // samlet rabat
  freeUnits: number; // antal gratis enheder
  lagersalgUnits: number; // antal lagersalgsenheder i alt
  unitsToNextFree: number | null; // 1 eller 2 når n % 3 != 0, null når n == 0 eller n % 3 == 0
  byKey: Record<string, { discountOere: number; freeUnits: number }>; // kun nøgler med rabat > 0
};

export const THREE_FOR_TWO_LABEL = "Lagersalg 3 for 2";

// Blandt alle lagersalgsenheder i kurven er de floor(n/3) billigste gratis.
export function threeForTwo(lines: ThreeForTwoLine[]): ThreeForTwoResult {
  const units: { key: string; price: number }[] = [];
  for (const line of lines) {
    if (!line.lagersalg) continue;
    for (let i = 0; i < line.quantity; i++) {
      units.push({ key: line.key, price: line.unitPriceOere });
    }
  }

  // Array.prototype.sort er stabil: ved lige pris står den tidligste linje først,
  // så den senere linjes enhed ligger sidst og bliver den gratis.
  units.sort((a, b) => b.price - a.price);

  const byKey: ThreeForTwoResult["byKey"] = {};
  let totalOere = 0;
  let freeUnits = 0;
  const free = Math.floor(units.length / 3);
  for (const { key, price } of units.slice(units.length - free)) {
    const entry = byKey[key] ?? { discountOere: 0, freeUnits: 0 };
    entry.discountOere += price;
    entry.freeUnits += 1;
    byKey[key] = entry;
    totalOere += price;
    freeUnits += 1;
  }

  const n = units.length;
  return {
    totalOere,
    freeUnits,
    lagersalgUnits: n,
    unitsToNextFree: n === 0 || n % 3 === 0 ? null : 3 - (n % 3),
    byKey,
  };
}
