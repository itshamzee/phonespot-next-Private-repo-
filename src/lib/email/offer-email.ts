/* ------------------------------------------------------------------ */
/*  Trade-In Offer Email Template                                       */
/* ------------------------------------------------------------------ */

import { BRAND, emailHeader, emailFooter } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape";

/**
 * The per-device split, when the lead had more than one device. Without it the
 * mail is the single-device layout it has always been \u2014 that is what every
 * offer created before offer_lines existed still renders as.
 */
export interface OfferEmailLines {
  included: { label: string; amountKr: string }[];
  excluded: { label: string; reasonBody: string }[];
}

interface OfferEmailParams {
  customerName: string;
  deviceType: string;
  brand: string;
  model: string;
  storage: string | null;
  conditionSummary: string;
  offerAmountKr: string; // formatted, e.g. "4.500,00 kr."
  acceptUrl: string;
  rejectUrl: string;
  lines?: OfferEmailLines | null;
}

/* One row per device we are buying, then the total. */
function deviceLinesBlock(lines: OfferEmailLines, totalKr: string): string {
  const rows = lines.included
    .map(
      (line, i) => `
                  <tr>
                    <td style="padding:${i === 0 ? "0" : "10px"} 0 10px;font-size:15px;color:${BRAND.charcoal};font-weight:600;border-bottom:1px solid ${BRAND.sand};">
                      ${escapeHtml(line.label)}
                    </td>
                    <td style="padding:${i === 0 ? "0" : "10px"} 0 10px;font-size:15px;color:${BRAND.charcoal};font-weight:700;text-align:right;white-space:nowrap;border-bottom:1px solid ${BRAND.sand};">
                      ${escapeHtml(line.amountKr)}
                    </td>
                  </tr>`,
    )
    .join("");

  return `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};border:1px solid ${BRAND.sand};border-radius:10px;margin:0 0 28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${BRAND.greenLight};">Dine enheder</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${rows}
                    <tr>
                      <td style="padding:14px 0 0;font-size:15px;color:${BRAND.charcoal};font-weight:700;">I alt</td>
                      <td style="padding:14px 0 0;font-size:15px;color:${BRAND.charcoal};font-weight:800;text-align:right;white-space:nowrap;">${escapeHtml(totalKr)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
}

/* The devices we cannot buy, each with the reason the customer reads. */
function excludedBlock(lines: OfferEmailLines): string {
  if (lines.excluded.length === 0) return "";

  const items = lines.excluded
    .map(
      (line) => `
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${BRAND.charcoal};">${escapeHtml(line.label)}</p>
                  <p style="margin:0 0 16px;font-size:13px;color:#666;line-height:1.6;">${escapeHtml(line.reasonBody)}</p>`,
    )
    .join("");

  return `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f3;border:1px solid ${BRAND.sand};border-radius:10px;margin:0 0 28px;">
              <tr>
                <td style="padding:20px 24px 6px;">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#b08968;">Disse kan vi ikke k\u00f8be</p>
                  ${items}
                </td>
              </tr>
            </table>`;
}

export function buildOfferEmailHtml(params: OfferEmailParams): string {
  const { offerAmountKr, acceptUrl, rejectUrl } = params;
  // Everything below is typed by the customer in the sell-device wizard.
  const customerName = escapeHtml(params.customerName);
  const deviceType = escapeHtml(params.deviceType);
  const brand = escapeHtml(params.brand);
  const model = escapeHtml(params.model);
  const storage = params.storage ? escapeHtml(params.storage) : null;
  const conditionSummary = escapeHtml(params.conditionSummary);

  const deviceLine = [brand, model, storage].filter(Boolean).join(" \u2014 ");

  // A single device with nothing excluded reads better as the original layout:
  // a one-row table over one device is noise.
  const lines = params.lines ?? null;
  const useLines = lines !== null && (lines.included.length > 1 || lines.excluded.length > 0);

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dit tilbud fra PhoneSpot</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};padding:40px 20px;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        ${emailHeader()}

        <!-- Subheader stripe -->
        <tr>
          <td style="background:${BRAND.green};padding:0;">
            <div style="height:3px;background:linear-gradient(90deg,${BRAND.green},${BRAND.greenLight});"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.charcoal};letter-spacing:-0.3px;">
              Hej ${customerName},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
              ${
                useLines
                  ? "Tak for din henvendelse om indbytte. Vi har gennemgået dine enheder og er klar med et tilbud til dig."
                  : `Tak for din henvendelse om indbytte af din ${deviceType.toLowerCase()}. Vi har gennemgået
              din enhed og er klar med et tilbud til dig.`
              }
            </p>

            <!-- Device info box -->
            ${
              useLines
                ? deviceLinesBlock(lines, offerAmountKr) + excludedBlock(lines)
                : `<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};border:1px solid ${BRAND.sand};border-radius:10px;margin:0 0 28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${BRAND.greenLight};">Enhed</p>
                  <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:${BRAND.charcoal};">${deviceLine}</p>
                  <p style="margin:0;font-size:13px;color:#777;">
                    Stand: <span style="color:${BRAND.charcoal};font-weight:600;">${conditionSummary}</span>
                  </p>
                </td>
              </tr>
            </table>`
            }

            <!-- Offer amount -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.green};border-radius:10px;margin:0 0 28px;">
              <tr>
                <td style="padding:28px 24px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.75);">
                    ${useLines ? "Samlet tilbud" : "Vores tilbud til dig"}
                  </p>
                  <p style="margin:0;font-size:44px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1.1;">
                    ${offerAmountKr}
                  </p>
                  <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.65);">
                    Tilbuddet er gyldigt i 7 dage
                  </p>
                </td>
              </tr>
            </table>

            <!-- Accept button -->
            <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 14px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:8px;background:${BRAND.green};" align="center">
                        <a
                          href="${acceptUrl}"
                          style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"
                        >Accepter tilbud</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Reject link -->
            <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 32px;">
              <tr>
                <td align="center">
                  <a
                    href="${rejectUrl}"
                    style="font-size:13px;color:#aaa;text-decoration:underline;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"
                  >Nej tak, afvis tilbud</a>
                </td>
              </tr>
            </table>

            <!-- Info note -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f3;border-left:3px solid ${BRAND.greenLight};border-radius:0 6px 6px 0;margin:0 0 8px;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0;font-size:13px;color:#555;line-height:1.5;">
                    Når vi modtager ${useLines ? "dine enheder" : "din enhed"}, foretager vi en fysisk kontrol.
                    Tilbuddet kan justeres hvis standbeskrivelsen afviger fra det modtagne. Du godkender
                    altid den endelige pris før udbetaling.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- USP bar + footer -->
        ${emailFooter()}

      </table>

    </td></tr>
  </table>

</body>
</html>`;
}

export function buildOfferEmailSubject(model: string, amountKr: string): string {
  return `Dit tilbud fra PhoneSpot \u2014 ${amountKr} for din ${model}`;
}

/**
 * Several devices have no single model to name in the subject, and stuffing
 * "(+1 enhed)" into the model name \u2014 which is what this did before \u2014 reads as a
 * bug to the customer.
 */
export function buildMultiDeviceOfferEmailSubject(deviceCount: number, amountKr: string): string {
  return `Dit tilbud fra PhoneSpot \u2014 ${amountKr} for dine ${deviceCount} enheder`;
}
