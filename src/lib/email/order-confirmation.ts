import { resend, EMAIL_FROM } from "./resend";
import { formatOere } from "@/lib/cart/utils";
import {
  BRAND,
  emailHeader,
  emailFooter,
  emailButton,
  emailItemRow,
  hasGuaranteeQualifyingDevice,
  uspsForOrder,
} from "@/lib/email/brand";
import { STORES } from "@/lib/store-config";

const SLAGELSE_ADDRESS = `${STORES.slagelse.street}, ${STORES.slagelse.zip} ${STORES.slagelse.city}`;

export interface OrderConfirmationItem {
  id: string;
  itemType: "device" | "sku_product";
  deviceId: string | null;
  skuProductId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  title?: string;
  image?: string;
  /** Set to true when this order_item had the battery upgrade. */
  batteryUpgrade?: boolean;
  /** sku_products.category — needed to tell a device-category sku_product
   *  (e.g. a phone sold outside the graded-device flow) apart from a real
   *  accessory when deciding the 36-month guarantee vs. reklamationsret
   *  wording. Absent/undefined for device items (itemType handles those). */
  category?: string | null;
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
  shippingMethod?: string;
  shippingAddress?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Order status progress bar — "Ordre → Behandling → Sendt → Leveret"
// ─────────────────────────────────────────────────────────────────────────────
function buildStatusBar(): string {
  const steps = [
    { label: "Ordre", done: true },
    { label: "Behandling", done: true },
    { label: "Sendt", done: false },
    { label: "Leveret", done: false },
  ];

  const stepCells = steps
    .map((step, idx) => {
      const isLast = idx === steps.length - 1;
      const dotBg = step.done ? BRAND.green : "#D9D5CE";
      const dotBorder = step.done ? BRAND.green : "#C0BBB2";
      const labelColor = step.done ? BRAND.charcoal : "#AAAAAA";
      const checkOrDot = step.done
        ? `<span style="color:#ffffff;font-size:11px;font-weight:700;line-height:20px;">&#10003;</span>`
        : `<span style="color:#C0BBB2;font-size:11px;line-height:20px;">&bull;</span>`;

      const connector = !isLast
        ? `<td style="padding:0;vertical-align:middle;">
             <div style="height:2px;width:24px;background:${step.done ? BRAND.greenLight : "#D9D5CE"};"></div>
           </td>`
        : "";

      return `
        <td style="padding:0;text-align:center;vertical-align:top;">
          <div style="width:20px;height:20px;border-radius:50%;background:${dotBg};border:2px solid ${dotBorder};margin:0 auto 6px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:20px;">
            ${checkOrDot}
          </div>
          <div style="font-size:11px;color:${labelColor};font-weight:${step.done ? "700" : "400"};white-space:nowrap;">${step.label}</div>
        </td>
        ${connector}`;
    })
    .join("\n");

  return `
    <!-- Order status bar -->
    <tr>
      <td style="padding:28px 40px 0;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            ${stepCells}
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Battery upgrade pill helper (inline-style, email-safe) — driven by order data
// ─────────────────────────────────────────────────────────────────────────────

function batteryUpgradeItemRow(item: OrderConfirmationItem, hasImages: boolean): string {
  const title =
    item.title ?? (item.itemType === "device" ? "Brugt enhed" : "Produkt");
  const qtyLabel = item.quantity > 1 ? ` &times;${item.quantity}` : "";
  const priceStr = formatOere(item.totalPrice);

  const thumbnailCell = item.image
    ? `<td width="64" style="padding:10px 12px 10px 0;vertical-align:top;">
         <img src="${item.image}" alt="${title}" width="56" height="56"
              style="width:56px;height:56px;object-fit:cover;border-radius:6px;display:block;border:1px solid ${BRAND.sand};" />
       </td>`
    : hasImages
      ? `<td width="64" style="padding:10px 12px 10px 0;vertical-align:top;"></td>`
      : "";

  return `
    <tr>
      ${thumbnailCell}
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.sand};vertical-align:middle;font-size:14px;color:${BRAND.charcoal};">
        ${title}${qtyLabel}
        <span style="display:inline-block;margin-left:6px;background:#FEF3E2;color:#B45309;font-size:10px;font-weight:700;letter-spacing:0.3px;padding:2px 7px;border-radius:20px;vertical-align:middle;line-height:16px;">Batteri-opgradering</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.sand};vertical-align:middle;font-size:14px;color:${BRAND.charcoal};text-align:right;white-space:nowrap;">
        +${priceStr}
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Items table using brand emailItemRow helper
// ─────────────────────────────────────────────────────────────────────────────
function buildItemsTable(items: OrderConfirmationItem[]): string {
  const hasImages = items.some((i) => !!i.image);

  const rows = items
    .map((item) => {
      const title =
        item.title ?? (item.itemType === "device" ? "Brugt enhed" : "Produkt");

      if (item.batteryUpgrade) {
        return batteryUpgradeItemRow(item, hasImages);
      }

      return emailItemRow({
        title,
        quantity: item.quantity,
        price: item.totalPrice,
        image: item.image,
      });
    })
    .join("\n");

  // If any item has an image we need a 4-column table (img | name | price),
  // otherwise 2-column (name | price). emailItemRow handles this internally
  // by emitting an empty thumbnailCell when image is absent — but we still
  // need the colgroup widths to be consistent. Wrapping in one table is fine.
  const tableStyle = `width:100%;border-collapse:collapse;`;
  const imgCol = hasImages ? `<col width="64" />` : "";

  return `
    <table cellpadding="0" cellspacing="0" style="${tableStyle}">
      <colgroup>${imgCol}<col /><col /></colgroup>
      ${rows}
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Price breakdown table
// ─────────────────────────────────────────────────────────────────────────────
function buildTotalsTable(params: SendOrderConfirmationParams): string {
  const shippingLabel =
    params.shippingCost === 0 ? "Gratis" : formatOere(params.shippingCost);

  const discountRow =
    params.discountAmount > 0
      ? `<tr>
           <td style="padding:6px 0;font-size:14px;color:${BRAND.greenLight};">
             Rabat${params.discountCode ? ` (${params.discountCode})` : ""}
           </td>
           <td style="padding:6px 0;font-size:14px;color:${BRAND.greenLight};text-align:right;white-space:nowrap;">
             &minus;${formatOere(params.discountAmount)}
           </td>
         </tr>`
      : "";

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#666;">Subtotal</td>
        <td style="padding:6px 0;font-size:14px;color:#666;text-align:right;white-space:nowrap;">
          ${formatOere(params.subtotal)}
        </td>
      </tr>
      ${discountRow}
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#666;">
          Fragt${params.shippingMethod ? ` <span style="color:#AAAAAA;">(${params.shippingMethod})</span>` : ""}
        </td>
        <td style="padding:6px 0;font-size:14px;color:#666;text-align:right;white-space:nowrap;">
          ${shippingLabel}
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0 0;font-size:17px;font-weight:700;color:${BRAND.charcoal};border-top:2px solid ${BRAND.charcoal};">
          I alt (inkl. moms)
        </td>
        <td style="padding:14px 0 0;font-size:17px;font-weight:700;color:${BRAND.charcoal};text-align:right;white-space:nowrap;border-top:2px solid ${BRAND.charcoal};">
          ${formatOere(params.total)}
        </td>
      </tr>
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildHtml — full branded HTML email
// ─────────────────────────────────────────────────────────────────────────────
function buildHtml(params: SendOrderConfirmationParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
  const withdrawalUrl = `${baseUrl}/fortrydelse?token=${params.withdrawalToken}`;

  const firstName = params.customer.name.split(" ")[0] ?? params.customer.name;

  // An accessory-only order must not promise the 36-month device guarantee
  // in its footer USP bar — only a genuine device (item_type "device", or a
  // sku_product in a device category) qualifies. See lib/email/brand.ts.
  const usps = uspsForOrder(hasGuaranteeQualifyingDevice(params.items));

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ordrebekræftelse #${params.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        ${emailHeader()}

        ${buildStatusBar()}

        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px;">Tak for din ordre</p>
            <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:${BRAND.charcoal};letter-spacing:-0.3px;">
              Hej ${firstName}!
            </h1>
            <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
              Vi har modtaget din betaling og er allerede i gang med at klargøre din ordre.
              Du modtager en e-mail med trackingnummer, når pakken er på vej.
            </p>
          </td>
        </tr>

        <!-- Order number badge -->
        <tr>
          <td style="padding:20px 40px 0;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:${BRAND.warmWhite};border:2px solid ${BRAND.sand};border-radius:8px;padding:10px 24px;">
                  <span style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:2px;">Ordrenummer</span>
                  <span style="font-size:20px;font-weight:800;color:${BRAND.charcoal};letter-spacing:0.5px;">#${params.orderNumber}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:28px 40px 0;">
            <div style="border-top:1px solid ${BRAND.sand};"></div>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td style="padding:24px 40px 0;">
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.8px;">
              Ordreoversigt
            </p>
            ${buildItemsTable(params.items)}
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:8px 40px 0;">
            ${buildTotalsTable(params)}
          </td>
        </tr>

        ${
          params.shippingAddress
            ? `
        <!-- Shipping info -->
        <tr>
          <td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};border-radius:8px;border:1px solid ${BRAND.sand};">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.8px;">Levering</p>
                  <p style="margin:0;font-size:14px;color:${BRAND.charcoal};line-height:1.5;">
                    ${params.shippingMethod ? `<strong>${params.shippingMethod}</strong><br />` : ""}
                    ${params.shippingAddress}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
            : ""
        }

        <!-- What happens next -->
        <tr>
          <td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#EBF4EF;border-radius:8px;border-left:4px solid ${BRAND.greenLight};">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${BRAND.charcoal};">Hvad sker der nu?</p>
                  <p style="margin:0;font-size:13px;color:#555;line-height:1.65;">
                    Din ordre behandles inden for 1&ndash;2 hverdage. Har du spørgsmål?
                    Skriv til <a href="mailto:${BRAND.orderEmail}" style="color:${BRAND.greenLight};text-decoration:none;font-weight:600;">${BRAND.orderEmail}</a>
                    eller ring på <a href="tel:+4561100048" style="color:${BRAND.greenLight};text-decoration:none;font-weight:600;">${BRAND.phone}</a>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:28px 40px 0;">
            <div style="border-top:1px solid ${BRAND.sand};"></div>
          </td>
        </tr>

        <!-- Fortrydelsesret -->
        <tr>
          <td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:8px;border-left:4px solid ${BRAND.sand};">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${BRAND.charcoal};">Fortrydelsesret &mdash; 14 dage</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#666;line-height:1.65;">
                    Du har 14 dages fortrydelsesret fra den dag du modtager varen, jf. forbrugeraftaleloven.
                    Ønsker du at fortryde dit køb, kan du bruge vores online fortrydelsesformular.
                  </p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:6px;background:${BRAND.charcoal};" align="center">
                        <a href="${withdrawalUrl}"
                           style="display:inline-block;padding:10px 20px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                          Brug fortrydelsesformularen
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Standardfortrydelsesformular (lovpligtig jf. forbrugeraftalelovens § 18) -->
        <tr>
          <td style="padding:20px 40px 0;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#BBBBBB;text-transform:uppercase;letter-spacing:0.6px;">
              Standardfortrydelsesformular
            </p>
            <div style="border:1px solid ${BRAND.sand};border-radius:6px;padding:16px 20px;font-size:12px;color:#888;line-height:1.75;">
              <p style="margin:0 0 8px;">
                (Denne formular udfyldes og returneres kun, hvis fortrydelsesretten gøres gældende.)
              </p>
              <p style="margin:0 0 4px;">
                Til: PhoneSpot, ${SLAGELSE_ADDRESS} &mdash; ${BRAND.orderEmail}
              </p>
              <p style="margin:0 0 8px;">
                Jeg/vi meddeler herved, at jeg/vi ønsker at gøre fortrydelsesretten gældende i forbindelse med
                min/vores købsaftale om følgende varer:
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

        ${emailFooter(usps)}

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
    `Til: PhoneSpot ApS, ${SLAGELSE_ADDRESS},`,
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
    SLAGELSE_ADDRESS,
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
