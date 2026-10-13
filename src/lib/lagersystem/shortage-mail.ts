import { sendStaffMail } from "@/lib/email/onecom-staff-mail";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { LOCATION_LABELS, locationForStore } from "./locations";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import type { ShortageLine } from "./types";

type TicketForMail = { id: string; ticket_number: string | null; device_model: string; customer_name: string; store_id: string | null };

export function buildShortageMail(t: TicketForMail, lines: ShortageLine[]): { to: string; subject: string; text: string } {
  const ref = t.ticket_number ?? t.id.slice(0, 8);
  const location = locationForStore(t.store_id);
  const store = storeLabel(normalizeStoreId(t.store_id));
  const text = [
    `Der mangler dele til en reparationssag (${store}).`,
    "",
    `Sag: ${ref}`,
    `Enhed: ${t.device_model}`,
    `Kunde: ${t.customer_name}`,
    ...(location ? [`Lager: ${LOCATION_LABELS[location]}`] : []),
    "",
    "Mangler:",
    ...lines.map((l) =>
      `- ${l.name} (${l.shared_sku}): skal bruge ${l.needed}, ledigt ${Math.max(0, l.available)}${l.available < 0 ? " (saldo i minus)" : ""}`,
    ),
    "",
    'Bestil delen hjem, og tryk "Markér som bestilt" på sagen:',
    `https://phonespot.dk/admin/reparationer/${t.id}`,
    "",
    "Kunden har ikke fået besked om dette.",
  ].join("\n");
  return { to: getStaffRecipients(t.store_id).to, subject: `Del skal bestilles: ${t.device_model} (${ref})`, text };
}

export async function notifyPartsShortage(t: TicketForMail, lines: ShortageLine[]): Promise<void> {
  await sendStaffMail(buildShortageMail(t, lines));
}
