import { normalizeStoreId } from "@/lib/stores";

/**
 * Whitelist over de felter personalet må ændre direkte på en sag. Alt andet i
 * body ignoreres — status har sin egen rute, fordi den logger og sender beskeder.
 */
export function buildTicketPatch(body: unknown): {
  patch: Record<string, unknown>;
  error?: string;
  /** IMEI/serienummer ligger på enheden (customer_devices), ikke på sagen. undefined = ikke ændret. */
  serialNumber?: string | null;
  /** Ret også kundekortet, så næste sag får de rigtige oplysninger. */
  updateCustomer?: boolean;
} {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ("is_urgent" in input) {
    if (typeof input.is_urgent !== "boolean") {
      return { patch, error: "is_urgent skal være sandt eller falsk" };
    }
    patch.is_urgent = input.is_urgent;
  }

  if ("on_hold_reason" in input) {
    const reason = input.on_hold_reason;
    if (reason !== null && typeof reason !== "string") {
      return { patch, error: "on_hold_reason skal være tekst eller null" };
    }
    const trimmed = typeof reason === "string" ? reason.trim() : null;
    patch.on_hold_reason = trimmed ? trimmed.slice(0, 200) : null;
  }

  if ("store_id" in input) {
    patch.store_id = normalizeStoreId(input.store_id);
  }

  // Kunde- og enhedsoplysninger. Samme grænser som ved oprettelse af sagen.
  for (const [field, rule] of Object.entries(DETAIL_FIELDS)) {
    if (!(field in input)) continue;
    const value = input[field];
    if (value !== null && typeof value !== "string") {
      return { patch, error: `${rule.label} skal være tekst` };
    }
    const trimmed = (value ?? "").trim().slice(0, rule.max);
    if (rule.required && !trimmed) return { patch, error: `${rule.label} må ikke være tomt` };
    if (field === "customer_phone" && trimmed && phoneDigits(trimmed).length < 8) {
      return { patch, error: "Telefonnummeret skal have mindst 8 cifre" };
    }
    if (field === "customer_email" && trimmed && !EMAIL_RE.test(trimmed)) {
      return { patch, error: "E-mailadressen ser forkert ud" };
    }
    patch[field] = trimmed;
  }

  let serialNumber: string | null | undefined;
  if ("serial_number" in input) {
    const value = input.serial_number;
    if (value !== null && typeof value !== "string") {
      return { patch, error: "IMEI / serienummer skal være tekst" };
    }
    serialNumber = (value ?? "").trim().slice(0, 60) || null;
  }

  if (Object.keys(patch).length === 0 && serialNumber === undefined) {
    return { patch, error: "Ingen gyldige felter at opdatere" };
  }
  return { patch, serialNumber, updateCustomer: input.update_customer === true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Felter på sagen, der kan rettes fra sagssiden. Rækkefølgen er visningsrækkefølgen i historikken. */
export const DETAIL_FIELDS: Record<string, { label: string; max: number; required?: boolean }> = {
  customer_name: { label: "Navn", max: 200, required: true },
  customer_phone: { label: "Telefon", max: 40 },
  customer_email: { label: "E-mail", max: 200 },
  device_model: { label: "Enhed", max: 200 },
  issue_description: { label: "Fejl", max: 2000 },
};
