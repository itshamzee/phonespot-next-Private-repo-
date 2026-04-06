import { resend, EMAIL_FROM } from "./resend";
import { BRAND, emailHeader, emailFooter, emailButton } from "./brand";

interface B2BWelcomeParams {
  companyName: string;
  contactName: string;
  contactEmail: string;
  cvrNummer: string;
}

function buildB2BWelcomeHtml(params: B2BWelcomeParams): string {
  const { companyName, contactName, cvrNummer } = params;

  return `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          ${emailHeader()}

          <!-- Welcome content -->
          <tr>
            <td style="padding:40px 40px 0;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND.charcoal};">
                Velkommen til PhoneSpot B2B
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#666;line-height:1.5;">
                Hej ${contactName},
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:${BRAND.charcoal};line-height:1.6;">
                Tak for din registrering som forhandler hos PhoneSpot. Vi har modtaget din
                ansoegning for <strong>${companyName}</strong> (CVR: ${cvrNummer}).
              </p>
            </td>
          </tr>

          <!-- Status box -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};border-radius:8px;border:1px solid ${BRAND.sand};">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${BRAND.green};">
                      Hvad sker der nu?
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                          <span style="color:${BRAND.green};font-weight:700;margin-right:8px;">1.</span>
                          Vi verificerer din virksomhed inden for 24 timer
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                          <span style="color:${BRAND.green};font-weight:700;margin-right:8px;">2.</span>
                          Du modtager en bekraeftelsesmail naar din konto er godkendt
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                          <span style="color:${BRAND.green};font-weight:700;margin-right:8px;">3.</span>
                          Log ind og faa adgang til engros-priser og B2B-sortiment
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- B2B benefits -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${BRAND.charcoal};">
                Dine fordele som forhandler
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                    <span style="color:${BRAND.greenLight};font-weight:700;margin-right:8px;">&#10003;</span>
                    Engros-priser paa hele vores sortiment
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                    <span style="color:${BRAND.greenLight};font-weight:700;margin-right:8px;">&#10003;</span>
                    Adgang til reservedele og reparationskomponenter
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                    <span style="color:${BRAND.greenLight};font-weight:700;margin-right:8px;">&#10003;</span>
                    Prioriteret kundeservice og teknisk support
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                    <span style="color:${BRAND.greenLight};font-weight:700;margin-right:8px;">&#10003;</span>
                    Fleksible betalingsbetingelser efter godkendelse
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:28px 40px;">
              ${emailButton("Gaa til B2B Portal", `${BRAND.website}/b2b/login`)}
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0;font-size:14px;color:#666;line-height:1.6;">
                Har du spoergsmaal? Kontakt os direkte paa
                <a href="mailto:b2b@phonespot.dk" style="color:${BRAND.green};text-decoration:none;font-weight:600;">b2b@phonespot.dk</a>
                eller ring
                <a href="tel:+4561100048" style="color:${BRAND.green};text-decoration:none;font-weight:600;">${BRAND.phone}</a>.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                Med venlig hilsen,<br />
                <strong>PhoneSpot B2B Team</strong>
              </p>
            </td>
          </tr>

          ${emailFooter()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildB2BWelcomePlainText(params: B2BWelcomeParams): string {
  const { companyName, contactName, cvrNummer } = params;
  return `Velkommen til PhoneSpot B2B

Hej ${contactName},

Tak for din registrering som forhandler hos PhoneSpot. Vi har modtaget din ansogning for ${companyName} (CVR: ${cvrNummer}).

HVAD SKER DER NU?
1. Vi verificerer din virksomhed inden for 24 timer
2. Du modtager en bekraeftelsesmail naar din konto er godkendt
3. Log ind og faa adgang til engros-priser og B2B-sortiment

DINE FORDELE SOM FORHANDLER:
- Engros-priser paa hele vores sortiment
- Adgang til reservedele og reparationskomponenter
- Prioriteret kundeservice og teknisk support
- Fleksible betalingsbetingelser efter godkendelse

Log ind: ${BRAND.website}/b2b/login

Har du sporgsmal? Kontakt os paa b2b@phonespot.dk eller ring ${BRAND.phone}.

Med venlig hilsen,
PhoneSpot B2B Team

PhoneSpot | CVR: ${BRAND.cvr}
${BRAND.store.address}
${BRAND.website}`;
}

export async function sendB2BWelcomeEmail(params: B2BWelcomeParams) {
  const html = buildB2BWelcomeHtml(params);
  const text = buildB2BWelcomePlainText(params);

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.contactEmail,
    subject: `Velkommen til PhoneSpot B2B — ${params.companyName}`,
    html,
    text,
  });

  if (error) {
    console.error("B2B welcome email error:", error);
  }

  return { data, error };
}
