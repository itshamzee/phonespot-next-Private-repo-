import { sendStaffMail } from "@/lib/email/onecom-staff-mail";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import type { Transfer } from "./api-types";
import { isPhoneSpotLocation, storesForLocation } from "./locations";
import { locationLabel } from "./transfers";

/** Mail til afsender-lokationens personale (spec §3.5 "Besked"). Hovedlager Vejle -> Vejle-butikken. */
export function buildTransferRequestMail(t: Transfer): { to: string; subject: string; text: string } {
  const store = isPhoneSpotLocation(t.from) ? storesForLocation(t.from)[0] ?? null : null;
  const from = locationLabel(t.from);
  const to = locationLabel(t.to);
  const text = [
    `${to} beder ${from} om at sende:`,
    ...t.lines.map((l) => `- ${l.qty_requested} × ${l.part_name} (${l.shared_sku})`),
    "",
    `Anmodet af: ${t.requested_by_label}`,
    ...(t.reference ? [`Reference: ${t.reference}`] : []),
    ...(t.note ? [`Note: ${t.note}`] : []),
    "",
    "Accepter og send, eller afvis anmodningen, på lagersiden:",
    "https://phonespot.dk/admin/lager/reservedele?fane=flytninger",
  ].join("\n");
  return { to: getStaffRecipients(store).to, subject: `Anmodning om dele til ${to}${t.reference ? ` (${t.reference})` : ""}`, text };
}

export async function sendTransferRequestMail(mail: { to: string; subject: string; text: string }): Promise<void> {
  await sendStaffMail(mail);
}
