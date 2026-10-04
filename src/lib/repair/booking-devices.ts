import { randomUUID } from "node:crypto";

// Bookingguiden kan bestille reparation af flere enheder i én booking. Hver
// enhed bliver sin egen repair_ticket (personalet håndterer dem som hver sin
// sag), men de hænger sammen via booking_details.booking_group_id, og kunden
// betaler én samlet sum. Rabatten gælder på tværs af enhederne, så den fordeles
// forholdsmæssigt, og summen af sagerne er præcis det, kunden så i guiden.

export const TEMPERED_GLASS_PRICE_DKK = 99;
export const MAX_BOOKING_DEVICES = 5;

export interface BookingService {
  id?: string;
  name: string;
  price_dkk: number;
}

export interface BookingDevice {
  device_type: string;
  device_model: string;
  service_type: string;
  selected_services: BookingService[];
  includes_tempered_glass: boolean;
}

export interface PricedBookingDevice extends BookingDevice {
  /** Pris før rabat (services + evt. beskyttelsesglas). */
  subtotal_dkk: number;
  /** Denne enheds andel af rabatten, i hele kroner. */
  discount_dkk: number;
  /** Det, denne enhed koster efter rabat. */
  total_price_dkk: number;
}

export type ParsedBooking =
  | { ok: true; devices: BookingDevice[]; multi: boolean }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseServices(value: unknown): BookingService[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: BookingService[] = [];
  for (const raw of value) {
    const svc = raw as Partial<BookingService> | null;
    const name = asString(svc?.name);
    const price = Number(svc?.price_dkk);
    if (!name || !Number.isFinite(price) || price < 0) return null;
    out.push({ ...(svc?.id ? { id: String(svc.id) } : {}), name, price_dkk: price });
  }
  return out;
}

/**
 * Læser enhederne i en booking-body. Uden `devices` (eller med kun én) bruges
 * de flade felter, præcis som før flerenhedsbookinger fandtes.
 */
export function parseBookingDevices(body: Record<string, unknown>): ParsedBooking {
  const rawDevices = Array.isArray(body.devices) ? body.devices : [];

  if (rawDevices.length >= 2) {
    if (rawDevices.length > MAX_BOOKING_DEVICES) {
      return { ok: false, error: `Maks ${MAX_BOOKING_DEVICES} enheder pr. booking` };
    }
    const devices: BookingDevice[] = [];
    for (const [i, raw] of rawDevices.entries()) {
      const d = raw as Record<string, unknown>;
      const device_type = asString(d.device_type);
      const device_model = asString(d.device_model);
      const selected_services = parseServices(d.selected_services);
      if (!device_type || !device_model || !selected_services) {
        return { ok: false, error: `Enhed ${i + 1} mangler mærke, model eller services` };
      }
      devices.push({
        device_type,
        device_model,
        service_type: asString(d.service_type) || selected_services.map((s) => s.name).join(", "),
        selected_services,
        includes_tempered_glass: d.includes_tempered_glass === true,
      });
    }
    return { ok: true, devices, multi: true };
  }

  const services = parseServices(body.selected_services);
  return {
    ok: true,
    multi: false,
    devices: [
      {
        device_type: asString(body.device_type),
        device_model: asString(body.device_model),
        service_type: asString(body.service_type),
        selected_services: services ?? [],
        includes_tempered_glass: body.includes_tempered_glass === true,
      },
    ],
  };
}

export function deviceSubtotal(device: BookingDevice): number {
  return (
    device.selected_services.reduce((sum, s) => sum + s.price_dkk, 0) +
    (device.includes_tempered_glass ? TEMPERED_GLASS_PRICE_DKK : 0)
  );
}

/**
 * Fordeler rabatten (samme regel som guiden: afrundet samlet rabat) på
 * enhederne efter deres andel af subtotalen. Største-rest-metoden sikrer, at
 * andelene summer til præcis den samlede rabat.
 */
export function priceBookingDevices(
  devices: BookingDevice[],
  discountPercent: number,
): { devices: PricedBookingDevice[]; subtotal: number; discount: number; total: number } {
  const subtotals = devices.map(deviceSubtotal);
  const subtotal = subtotals.reduce((a, b) => a + b, 0);
  const pct = Number.isFinite(discountPercent) ? Math.min(Math.max(discountPercent, 0), 100) : 0;
  const discount = Math.round(subtotal * (pct / 100));

  const shares = subtotals.map((s) => (subtotal > 0 ? (discount * s) / subtotal : 0));
  const floors = shares.map(Math.floor);
  let remaining = discount - floors.reduce((a, b) => a + b, 0);
  const byRemainder = shares
    .map((share, i) => ({ i, rest: share - floors[i] }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of byRemainder) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }

  return {
    devices: devices.map((d, i) => ({
      ...d,
      subtotal_dkk: subtotals[i],
      discount_dkk: floors[i],
      total_price_dkk: subtotals[i] - floors[i],
    })),
    subtotal,
    discount,
    total: subtotal - discount,
  };
}

export interface BookingGroup {
  booking_group_id: string;
  booking_device_count: number;
  booking_group_total_dkk: number;
}

export function newBookingGroup(count: number, groupTotal: number): BookingGroup {
  return {
    booking_group_id: randomUUID(),
    booking_device_count: count,
    booking_group_total_dkk: groupTotal,
  };
}

/** Metadata-feltet i Stripe tåler 500 tegn; 5 uuid'er + komma er ca. 184. */
export function parseTicketIdList(metadata: Record<string, string> | null | undefined): string[] {
  const list = (metadata?.repair_ticket_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length > 0) return [...new Set(list)];
  return metadata?.repair_ticket_id ? [metadata.repair_ticket_id] : [];
}

/** Rabatreglen fra guiden og prisside-kurven: 10% ved 2 reparationer, 15% ved 3+ (samlet for hele bookingen). */
export function discountPercentForServiceCount(count: number): number {
  return count >= 3 ? 15 : count >= 2 ? 10 : 0;
}
