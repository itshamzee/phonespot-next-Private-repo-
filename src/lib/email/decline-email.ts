/* ------------------------------------------------------------------ */
/*  Buyback Decline Email Template                                      */
/* ------------------------------------------------------------------ */

import { BRAND, emailHeader, emailFooter } from "@/lib/email/brand";
import { declineReason, type DeclineReasonCode } from "@/lib/buyback/decline-reasons";

interface DeclineEmailParams {
  customerName: string;
  deviceLabel: string;
  reasonCode: DeclineReasonCode;
}

export function buildDeclineEmailSubject(deviceLabel: string): string {
  return `Vedrørende din ${deviceLabel}`;
}

// Terminal email: there is nothing for the customer to click. No token, no accept
// or reject links — the conversation continues by reply if they want it to. Built
// as a sibling of offer-email.ts so a decline does not look like it came from a
// different company.
export function buildDeclineEmailHtml(params: DeclineEmailParams): string {
  const { customerName, deviceLabel, reasonCode } = params;
  const reason = declineReason(reasonCode);

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vedrørende din enhed</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};padding:40px 20px;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        ${emailHeader()}

        <tr>
          <td style="background:${BRAND.green};padding:0;">
            <div style="height:3px;background:linear-gradient(90deg,${BRAND.green},${BRAND.greenLight});"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">

            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.charcoal};letter-spacing:-0.3px;">
              Hej ${customerName},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
              Tak fordi du tilbød os din ${deviceLabel}.
            </p>

            <!-- The reason, given plainly -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};border:1px solid ${BRAND.sand};border-radius:10px;margin:0 0 28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
                    ${reason.body}
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:15px;color:#555;line-height:1.6;">
              Du er altid velkommen til at skrive til os, hvis du har spørgsmål, eller hvis du
              har andre enheder du gerne vil sælge.
            </p>
            <p style="margin:24px 0 0;font-size:15px;color:#555;line-height:1.6;">
              Venlig hilsen<br />PhoneSpot
            </p>

          </td>
        </tr>

        ${emailFooter()}

      </table>

    </td></tr>
  </table>

</body>
</html>`;
}
