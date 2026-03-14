import { resend, EMAIL_FROM } from "./resend";
import { formatOere } from "@/lib/cart/utils";

export interface OrderConfirmationItem {
  id: string;
  itemType: "device" | "sku_product";
  deviceId: string | null;
  skuProductId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  title?: string;
}

export interface SendOrderConfirmationParams {
  orderId: string;
  orderNumber: string;
  customer: {
    email: string;
    name: string;
  };
  items: OrderConfirmationItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  withdrawalToken: string;
  discountCode?: string;
}

function buildItemRows(items: OrderConfirmationItem[]): string {
  return items
    .map((item) => {
      const label = item.title ?? (item.itemType === "device" ? "Brugt enhed" : "Produkt");
      const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#3A3D38;">
            ${label}${qty}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#3A3D38;text-align:right;white-space:nowrap;">
            ${formatOere(item.totalPrice)}
          </td>
        </tr>`;
    })
    .join("\n");
}

function buildHtml(params: SendOrderConfirmationParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
  const withdrawalUrl = `${baseUrl}/fortrydelse?token=${params.withdrawalToken}`;
  const itemRows = buildItemRows(params.items);
  const shippingLabel = params.shippingCost === 0 ? "Gratis" : formatOere(params.shippingCost);

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ordrebekræftelse #${params.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#3A3D38;padding:28px 40px;text-align:center;">
            <img src="https://phonespot.dk/brand/logos/phonespot-wordmark-white.svg" alt="PhoneSpot" height="34" style="height:34px;" />
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:36px 40px 0;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Tak for din ordre</p>
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#3A3D38;">Ordre #${params.orderNumber}</h1>
            <p style="margin:0;font-size:15px;color:#666;">
              Hej ${params.customer.name}, vi har modtaget din betaling og behandler din ordre nu.
            </p>
          </td>
        </tr>

        <!-- Order summary -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#3A3D38;text-transform:uppercase;letter-spacing:0.5px;">Ordreoversigt</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
            </table>

            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#666;">Subtotal</td>
                <td style="padding:6px 0;font-size:14px;color:#666;text-align:right;">${formatOere(params.subtotal)}</td>
              </tr>
              ${
                params.discountAmount > 0
                  ? `<tr>
                  <td style="padding:6px 0;font-size:14px;color:#5A8C6F;">
                    Rabat${params.discountCode ? ` (${params.discountCode})` : ""}
                  </td>
                  <td style="padding:6px 0;font-size:14px;color:#5A8C6F;text-align:right;">
                    -${formatOere(params.discountAmount)}
                  </td>
                </tr>`
                  : ""
              }
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#666;">Fragt</td>
                <td style="padding:6px 0;font-size:14px;color:#666;text-align:right;">${shippingLabel}</td>
              </tr>
              <tr>
                <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#3A3D38;border-top:2px solid #3A3D38;">I alt (inkl. moms)</td>
                <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#3A3D38;text-align:right;border-top:2px solid #3A3D38;">${formatOere(params.total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What happens next -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#3A3D38;text-transform:uppercase;letter-spacing:0.5px;">Hvad sker der nu?</p>
            <p style="margin:0 0 10px;font-size:14px;color:#666;">
              Din ordre er bekræftet og vil blive sendt inden for 1-2 hverdage. Du modtager en separat e-mail med dit trackingnummer, når pakken er afsendt.
            </p>
            <p style="margin:0;font-size:14px;color:#666;">
              Har du spørgsmål? Skriv til <a href="mailto:ha@phonespot.dk" style="color:#5A8C6F;text-decoration:none;">ha@phonespot.dk</a>.
            </p>
          </td>
        </tr>

        <!-- Fortrydelsesret -->
        <tr>
          <td style="padding:32px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:8px;border-left:4px solid #5A8C6F;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#3A3D38;">Fortrydelsesret — 14 dage</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#555;line-height:1.6;">
                    Du har 14 dages fortrydelsesret fra den dag du modtager varen, jf. forbrugeraftaleloven.
                    Ønsker du at fortryde dit køb, kan du bruge vores online fortrydelsesformular eller sende en klar erklæring pr. e-mail.
                  </p>
                  <a href="${withdrawalUrl}"
                     style="display:inline-block;background:#3A3D38;color:#ffffff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
                    Brug fortrydelsesformularen
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Standardfortrydelsesformular (lovpligtig) -->
        <tr>
          <td style="padding:24px 40px 0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
              Standardfortrydelsesformular
            </p>
            <div style="border:1px solid #e0dcd6;border-radius:6px;padding:16px 20px;font-size:12px;color:#666;line-height:1.7;">
              <p style="margin:0 0 8px;">
                (Denne formular udfyldes og returneres kun, hvis fortrydelsesretten gøres gældende.)
              </p>
              <p style="margin:0 0 4px;">
                Til: PhoneSpot, Vestsjællandscentret 10A, 103, 4200 Slagelse — ha@phonespot.dk
              </p>
              <p style="margin:0 0 8px;">
                Jeg/vi meddeler herved, at jeg/vi ønsker at gøre fortrydelsesretten gældende i
                forbindelse med min/vores købsaftale om følgende varer:
              </p>
              <p style="margin:0 0 4px;">Ordre: #${params.orderNumber}</p>
              <p style="margin:0 0 4px;">Bestilt den / modtaget den:</p>
              <p style="margin:0 0 4px;">Forbrugerens navn:</p>
              <p style="margin:0 0 4px;">Forbrugerens adresse:</p>
              <p style="margin:0;">Forbrugerens underskrift (kun hvis formularens indhold meddeles på papir):</p>
              <p style="margin:8px 0 0;">Dato:</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:32px 40px;text-align:center;border-top:1px solid #f0ede8;margin-top:32px;">
            <p style="margin:0 0 4px;font-size:12px;color:#999;">
              PhoneSpot &bull; Vestsjællandscentret 10A, 103 &bull; 4200 Slagelse
            </p>
            <p style="margin:0 0 4px;font-size:12px;color:#999;">
              CVR: 38688766 &bull; ha@phonespot.dk &bull; phonespot.dk
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#bbb;">
              Denne e-mail er automatisk genereret. Gem den som dokumentation for dit køb.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Plain-text order confirmation (used for plain-text email parts and testing)
// ---------------------------------------------------------------------------

type OrderConfirmationData = {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number; // in øre
  }>;
  subtotal: number; // in øre
  shippingCost: number; // in øre
  discountAmount: number; // in øre
  total: number; // in øre
  shippingAddress: string;
  shippingMethod: string;
  withdrawalUrl: string; // e.g. https://phonespot.dk/fortryd/[token]
};

function formatDKK(øre: number): string {
  return (
    (øre / 100).toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " kr."
  );
}

/**
 * Build the plain-text order confirmation email.
 * Includes the standard fortrydelsesformular as required by
 * Forbrugeraftalelovens § 18.
 */
export function buildOrderConfirmationEmail(
  data: OrderConfirmationData,
): string {
  const itemLines = data.items.map(
    (item) =>
      `  ${item.name} x${item.quantity} — ${formatDKK(item.unitPrice * item.quantity)}`,
  );

  return [
    `Kære ${data.customerName},`,
    "",
    `Tak for din ordre hos PhoneSpot! Her er din ordrebekræftelse.`,
    "",
    "══════════════════════════════════════",
    `ORDREBEKRÆFTELSE — #${data.orderNumber}`,
    "══════════════════════════════════════",
    "",
    "Produkter:",
    ...itemLines,
    "",
    `Subtotal: ${formatDKK(data.subtotal)}`,
    data.discountAmount > 0
      ? `Rabat: -${formatDKK(data.discountAmount)}`
      : null,
    `Fragt (${data.shippingMethod}): ${formatDKK(data.shippingCost)}`,
    `Total (inkl. moms): ${formatDKK(data.total)}`,
    "",
    `Leveres til: ${data.shippingAddress}`,
    "",
    "══════════════════════════════════════",
    "FORTRYDELSESRET (14 DAGE)",
    "══════════════════════════════════════",
    "",
    "Du har 14 dages fortrydelsesret fra den dag, du modtager varen.",
    "Fortrydelsesfristen udløber 14 dage efter den dag, du eller en",
    "af dig angiven tredjemand, som ikke er transportøren, får varerne",
    "i fysisk besiddelse.",
    "",
    "Du kan fortryde dit køb her:",
    data.withdrawalUrl,
    "",
    "Returomkostninger afholdes af dig som køber.",
    "Tilbagebetaling sker senest 14 dage efter modtagelse af din",
    "fortrydelsesmeddelelse, dog tidligst når varen er modtaget retur.",
    "",
    "══════════════════════════════════════",
    "STANDARDFORTRYDELSESFORMULAR",
    "══════════════════════════════════════",
    "",
    "(Denne formular udfyldes og returneres kun, hvis du ønsker at",
    "fortryde aftalen)",
    "",
    "Til: PhoneSpot ApS, VestsjællandsCentret 10, 4200 Slagelse,",
    "     info@phonespot.dk",
    "",
    "Jeg/vi (*) meddeler herved, at jeg/vi (*) ønsker at gøre",
    "fortrydelsesretten gældende i forbindelse med min/vores (*)",
    "købsaftale om følgende varer (*)/levering af følgende",
    "tjenesteydelser (*):",
    "",
    "_______________________________________________",
    "",
    `Bestilt den (*)/modtaget den (*): _______________`,
    `Forbrugerens/forbrugernes navn(e): _______________`,
    `Forbrugerens/forbrugernes adresse: _______________`,
    `Ordrenummer: ${data.orderNumber}`,
    "",
    "Forbrugerens/forbrugernes underskrift",
    "(kun hvis denne formular indleveres på papir):",
    "",
    "_______________________________________________",
    "",
    "Dato: _______________",
    "",
    "(*) Det ikke-relevante streges.",
    "",
    "══════════════════════════════════════",
    "",
    "Har du spørgsmål? Kontakt os på info@phonespot.dk.",
    "",
    "Med venlig hilsen,",
    "PhoneSpot ApS",
    "CVR: 38688766",
    "VestsjællandsCentret 10, 4200 Slagelse",
    "info@phonespot.dk | phonespot.dk",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ---------------------------------------------------------------------------

export async function sendOrderConfirmation(
  params: SendOrderConfirmationParams,
): Promise<void> {
  const html = buildHtml(params);
  const subject = `Ordrebekræftelse #${params.orderNumber} — PhoneSpot`;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.customer.email,
    subject,
    html,
  });

  if (error) {
    throw new Error(
      `Failed to send order confirmation email: ${JSON.stringify(error)}`,
    );
  }
}
