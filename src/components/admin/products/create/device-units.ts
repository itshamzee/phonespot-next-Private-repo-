import { parseKrToOere } from "./money";

/** Én række i enhedstabellen: samme stand/lagerplads/farve/pris, `count` eksemplarer. */
export interface UnitRow {
  key: string;
  grade: "A" | "B" | "C";
  storage: string;
  color: string;
  price: string;
  purchasePrice: string;
  locationId: string;
  imei: string;
  batteryHealth: string;
  count: string;
}

export interface QuickAddPayload {
  template_id: string;
  grade: "A" | "B" | "C";
  storage?: string;
  color?: string;
  purchase_price: number;
  selling_price: number;
  location_id: string;
  imei?: string;
  battery_health?: number;
  vat_scheme: "brugtmoms";
  status: "listed";
}

export function emptyUnitRow(defaults: Partial<UnitRow> = {}): UnitRow {
  return {
    key: Math.random().toString(36).slice(2, 8),
    grade: "A",
    storage: "",
    color: "",
    price: "",
    purchasePrice: "",
    locationId: "",
    imei: "",
    batteryHealth: "",
    count: "1",
    ...defaults,
  };
}

export function unitRowError(row: UnitRow): string | null {
  const price = parseKrToOere(row.price);
  const purchase = parseKrToOere(row.purchasePrice);
  const count = Number(row.count);
  if (price == null || price <= 0) return "Salgspris mangler";
  if (purchase == null || purchase <= 0) return "Indkøbspris mangler";
  if (!row.locationId) return "Vælg lagerplads";
  if (!Number.isInteger(count) || count < 1 || count > 50) return "Antal skal være 1–50";
  if (count > 1 && row.imei.trim()) return "IMEI kan kun sættes på én enhed ad gangen";
  if (row.batteryHealth && (Number(row.batteryHealth) < 0 || Number(row.batteryHealth) > 100)) return "Batteri skal være 0–100";
  return null;
}

/** Udvider rækkerne til ét quick-add-kald pr. fysisk enhed. Kaster ved fejl. */
export function buildUnitPayloads(templateId: string, rows: UnitRow[]): QuickAddPayload[] {
  const out: QuickAddPayload[] = [];
  for (const row of rows) {
    const error = unitRowError(row);
    if (error) throw new Error(error);
    const count = Number(row.count);
    for (let i = 0; i < count; i++) {
      out.push({
        template_id: templateId,
        grade: row.grade,
        storage: row.storage.trim() || undefined,
        color: row.color.trim() || undefined,
        purchase_price: parseKrToOere(row.purchasePrice)!,
        selling_price: parseKrToOere(row.price)!,
        location_id: row.locationId,
        imei: row.imei.trim() || undefined,
        battery_health: row.batteryHealth ? Number(row.batteryHealth) : undefined,
        vat_scheme: "brugtmoms",
        status: "listed",
      });
    }
  }
  if (!out.length) throw new Error("Tilføj mindst én enhed");
  return out;
}
