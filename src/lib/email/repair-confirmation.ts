import { resend } from "./resend";
import { BRAND, emailButton, emailFooter, emailHeader } from "./brand";
import { escapeHtml } from "./escape";
import { normalizeStoreId } from "@/lib/stores";
import { STORES, type StoreLocationConfig } from "@/lib/store-config";

// Kundens kvittering for en reparationsbooking. Den skal svare på tre
// spørgsmål uden at kunden skal kontakte os: Er bookingen gået igennem? Hvor og
// hvornår skal jeg komme? Hvad koster det, og er det betalt?

export const REPAIR_EMAIL_FROM = "PhoneSpot Reparation <noreply@phonespot.dk>";

const REPAIR_USPS = [
  "Livstidsgaranti på arbejde og dele",
  "90% klar på 30 min.",
  "Gratis parkering",
] as const;

export interface RepairConfirmationParams {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  deviceLabel: string;
  services: { name: string; price_dkk: number }[];
  includesTemperedGlass?: boolean;
  temperedGlassPrice?: number;
  discountPercent?: number;
  totalDkk?: number | null;
  paid: boolean;
  deliveryMethod?: string | null;
  storeId?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
}

const kr = (value: number) => `${value.toLocaleString("da-DK")} kr.`;

export function formatDanishDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function storeFor(params: RepairConfirmationParams): StoreLocationConfig | null {
  const slug = normalizeStoreId(params.storeId) ?? normalizeStoreId(params.deliveryMethod);
  return slug ? STORES[slug] : null;
}

export function repairStatusUrl(ticketId: string): string {
  return `${BRAND.website}/reparation/status/${ticketId}`;
}

export function buildRepairConfirmationSubject(params: RepairConfirmationParams): string {
  const short = params.ticketId.slice(0, 8);
  return params.paid
    ? `Betalt og booket: din reparation (${short})`
    : `Booking bekræftet: din reparation (${short})`;
}

export function buildRepairConfirmationHtml(params: RepairConfirmationParams): string {
  const store = storeFor(params);
  const mailIn = params.deliveryMethod === "Send ind";
  const firstName = escapeHtml(params.customerName.trim().split(/\s+/)[0] ?? "");
  const hasBooking = params.services.length > 0;

  const when = params.preferredDate
    ? `${formatDanishDate(params.preferredDate)}${params.preferredTime ? `, kl. ${escapeHtml(params.preferredTime)}` : ""}`
    : null;

  const nextStep = mailIn
    ? `Du har valgt at sende din enhed ind. Vi kontakter dig med instruktioner til den gratis forsendelse${store ? ` til ${escapeHtml(store.name)}` : ""}.`
    : store
      ? `Kom forbi ${escapeHtml(store.name)}${when ? ` ${when}` : ""}. Du kan også komme på et andet tidspunkt i åbningstiden.`
      : "Vi kontakter dig og aftaler, hvor og hvornår du afleverer din enhed.";

  const storeBlock =
    store && !mailIn
      ? `
        <tr><td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};border-radius:10px;">
            <tr><td style="padding:18px 20px;font-size:14px;line-height:1.6;color:${BRAND.charcoal};">
              <strong>${escapeHtml(store.name)}</strong><br />
              ${escapeHtml(store.street)}, ${escapeHtml(store.zip)} ${escapeHtml(store.city)}<br />
              Man–fre ${escapeHtml(store.hours.weekdays)} · Lør ${escapeHtml(store.hours.saturday)} · Søn ${escapeHtml(store.hours.sunday)}<br />
              Tlf. ${escapeHtml(store.phone)} ·
              <a href="${store.googleMapsUrl}" style="color:${BRAND.green};">Find vej</a>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  const subtotal =
    params.services.reduce((sum, s) => sum + s.price_dkk, 0) +
    (params.includesTemperedGlass ? params.temperedGlassPrice ?? 99 : 0);
  const discount = params.totalDkk != null ? Math.round(subtotal - params.totalDkk) : 0;

  const serviceRows = params.services
    .map(
      (s) => `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:${BRAND.charcoal};border-bottom:1px solid ${BRAND.sand};">${escapeHtml(s.name)}</td>
          <td style="padding:8px 0;font-size:14px;color:${BRAND.charcoal};border-bottom:1px solid ${BRAND.sand};text-align:right;white-space:nowrap;">${kr(s.price_dkk)}</td>
        </tr>`,
    )
    .join("");

  const extraRows = [
    params.includesTemperedGlass
      ? `<tr><td style="padding:8px 0;font-size:14px;border-bottom:1px solid ${BRAND.sand};">Beskyttelsesglas</td><td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid ${BRAND.sand};">${kr(params.temperedGlassPrice ?? 99)}</td></tr>`
      : "",
    params.discountPercent
      ? `<tr><td style="padding:8px 0;font-size:14px;color:${BRAND.green};">Rabat (${params.discountPercent}%)</td><td style="padding:8px 0;font-size:14px;text-align:right;color:${BRAND.green};">${discount > 0 ? `−${kr(discount)}` : "Fratrukket"}</td></tr>`
      : "",
    params.totalDkk != null
      ? `<tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;">I alt</td><td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;">${kr(params.totalDkk)}</td></tr>
         <tr><td colspan="2" style="padding:4px 0 0;font-size:13px;color:${params.paid ? BRAND.green : "#6E6E73"};">${params.paid ? "Betalt online" : "Betales i butikken, når reparationen er færdig"}</td></tr>`
      : "",
  ].join("");

  const summary = hasBooking
    ? `
        <tr><td style="padding:0 40px 8px;font-size:13px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#6E6E73;">Din reparation · ${escapeHtml(params.deviceLabel)}</td></tr>
        <tr><td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">${serviceRows}${extraRows}</table>
        </td></tr>`
    : `
        <tr><td style="padding:0 40px 24px;font-size:14px;line-height:1.6;color:${BRAND.charcoal};">
          Enhed: ${escapeHtml(params.deviceLabel)}. Vi vurderer fejlen og giver dig en fast pris, før vi går i gang.
        </td></tr>`;

  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.charcoal};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
        ${emailHeader()}
        <tr><td style="padding:36px 40px 8px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:24px;background:${BRAND.green};color:#ffffff;font-size:24px;font-weight:700;">&#10003;</div>
          <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;color:${BRAND.charcoal};">${params.paid ? "Tak! Din reparation er betalt og booket" : "Din reparation er booket"}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#6E6E73;">Hej ${firstName}, vi har modtaget din booking. Du behøver ikke gøre mere end at møde op.</p>
        </td></tr>
        <tr><td style="padding:20px 40px 24px;text-align:center;">
          <span style="display:inline-block;padding:8px 16px;border-radius:8px;background:${BRAND.warmWhite};font-size:14px;">Sags-nr. <strong style="font-family:monospace;letter-spacing:1px;">${escapeHtml(params.ticketId.slice(0, 8))}</strong></span>
        </td></tr>
        <tr><td style="padding:0 40px 8px;font-size:13px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#6E6E73;">Næste skridt</td></tr>
        <tr><td style="padding:0 40px 16px;font-size:15px;line-height:1.6;">${nextStep}</td></tr>
        ${storeBlock}
        ${summary}
        <tr><td style="padding:0 40px 24px;font-size:14px;line-height:1.6;color:${BRAND.charcoal};">
          <strong>Inden du kommer:</strong> Tag en backup af din telefon, og husk din skærmkode, så vi kan teste enheden bagefter.
        </td></tr>
        <tr><td style="padding:0 40px 32px;">${emailButton("Følg din reparation", repairStatusUrl(params.ticketId))}</td></tr>
        <tr><td style="padding:0 40px;font-size:13px;line-height:1.6;color:#6E6E73;text-align:center;">
          Skal du ændre noget? Svar på denne mail eller ring på ${escapeHtml(store?.phone ?? BRAND.phone)}.
        </td></tr>
        ${emailFooter(REPAIR_USPS)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildRepairConfirmationText(params: RepairConfirmationParams): string {
  const store = storeFor(params);
  const lines = [
    `Hej ${params.customerName.trim().split(/\s+/)[0] ?? ""},`,
    "",
    params.paid ? "Tak! Din reparation er betalt og booket." : "Din reparation er booket.",
    `Sags-nr.: ${params.ticketId.slice(0, 8)}`,
    `Enhed: ${params.deviceLabel}`,
    ...params.services.map((s) => `- ${s.name}: ${kr(s.price_dkk)}`),
  ];
  if (params.totalDkk != null)
    lines.push(`I alt: ${kr(params.totalDkk)} (${params.paid ? "betalt online" : "betales i butikken"})`);
  if (store && params.deliveryMethod !== "Send ind")
    lines.push("", `${store.name}, ${store.street}, ${store.zip} ${store.city}`);
  if (params.preferredDate)
    lines.push(`Tidspunkt: ${formatDanishDate(params.preferredDate)}${params.preferredTime ? ` kl. ${params.preferredTime}` : ""}`);
  lines.push("", `Følg din reparation: ${repairStatusUrl(params.ticketId)}`, "", "Med venlig hilsen", "PhoneSpot");
  return lines.join("\n");
}

/** Sender kvitteringen. Resend kaster ikke ved fejl, men returnerer `error` —
 *  den skal logges, ellers opdager vi aldrig, at kunden ikke fik sin mail. */
export async function sendRepairConfirmation(params: RepairConfirmationParams): Promise<boolean> {
  const store = storeFor(params);
  const { error } = await resend.emails.send({
    from: REPAIR_EMAIL_FROM,
    to: params.customerEmail.trim(),
    replyTo: store?.email ?? BRAND.email,
    subject: buildRepairConfirmationSubject(params),
    html: buildRepairConfirmationHtml(params),
    text: buildRepairConfirmationText(params),
  });
  if (error) {
    console.error("[repair-confirmation] customer email failed:", params.ticketId, error);
    return false;
  }
  return true;
}
