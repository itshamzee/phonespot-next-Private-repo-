/* ------------------------------------------------------------------ */
/*  Trade-In Offer Email Template                                      */
/* ------------------------------------------------------------------ */

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
}

export function buildOfferEmailHtml(params: OfferEmailParams): string {
  const {
    customerName,
    deviceType,
    brand,
    model,
    storage,
    conditionSummary,
    offerAmountKr,
    acceptUrl,
    rejectUrl,
  } = params;

  const deviceLine = [brand, model, storage].filter(Boolean).join(" — ");

  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#3A3D38;padding:30px 40px;text-align:center;">
            <img src="https://phonespot.dk/brand/logos/phonespot-wordmark-white.svg" alt="PhoneSpot" height="36" style="height:36px;"/>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;font-size:16px;color:#3A3D38;">Hej ${customerName},</p>
            <p style="margin:0 0 20px;font-size:16px;color:#3A3D38;">
              Tak for din henvendelse. Vi har vurderet din ${deviceType.toLowerCase()}:
            </p>
            <table width="100%" style="background:#f9f7f4;border-radius:8px;padding:16px;margin:0 0 20px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0 0 6px;font-size:14px;color:#666;">${deviceLine}</p>
                <p style="margin:0;font-size:14px;color:#666;">Stand: ${conditionSummary}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:1px;">Vores tilbud</p>
            <p style="margin:0 0 30px;font-size:36px;font-weight:700;color:#3A3D38;">${offerAmountKr}</p>
            <!-- Accept button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
              <tr><td align="center">
                <a href="${acceptUrl}" style="display:inline-block;background:#5A8C6F;color:#ffffff;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;text-decoration:none;">
                  Accept\u00e9r tilbud
                </a>
              </td></tr>
            </table>
            <!-- Reject link -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
              <tr><td align="center">
                <a href="${rejectUrl}" style="font-size:14px;color:#999;text-decoration:underline;">
                  Afvis tilbud
                </a>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;">Tilbuddet er gyldigt i 7 dage.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f7f4;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">
              PhoneSpot \u00b7 Vestsj\u00e6llandscentret 10A, 103 \u00b7 4200 Slagelse \u00b7 ha@phonespot.dk
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildOfferEmailSubject(model: string, amountKr: string): string {
  return `Dit tilbud fra PhoneSpot \u2014 ${amountKr} for din ${model}`;
}
