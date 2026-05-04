import { resend, EMAIL_FROM } from "./resend";
import { BRAND } from "@/lib/email/brand";

const STAFF_EMAIL = "info@phonespot.dk";

const SHIPPING_LABELS: Record<string, string> = {
  postnord_myparcel:    "PostNord MyPack Collect (pakkeshop)",
  postnord_home:        "PostNord Hjem-levering",
  gls_parcelshop:       "GLS PakkeShop",
  gls_home:             "GLS Hjem-levering",
  dao_parcelshop:       "DAO Pakkeshop",
  click_collect_cph:    "Afhentning \u2014 København",
  click_collect_aarhus: "Afhentning \u2014 Aarhus",
  click_collect_vejle:  "Afhentning \u2014 Vejle",
  click_collect_slagelse: "Afhentning \u2014 Slagelse",
};

function shippingLabel(method: string | null): string {
  return SHIPPING_LABELS[method || ""] || method || "Ikke angivet";
}

function formatDKK(oere: number): string {
  return (
    (oere / 100).toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " kr."
  );
}

export interface StaffOrderNotificationParams {
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  total: number; // in øre
  shippingCost: number; // in øre
  shippingMethod: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number; // in øre
  }>;
}

// ── HTML builder ───────────────────────────────────────────────────────────────

function buildStaffNotificationHtml(params: StaffOrderNotificationParams): string {
  const font = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  const green   = BRAND.green;
  const charcoal = BRAND.charcoal;
  const sand    = BRAND.sand;

  const adminOrdersUrl = `https://phonespot.dk/admin/platform/orders`;

  const itemRows = params.items.map((item) => {
    const qty = item.quantity > 1 ? ` &times;${item.quantity}` : "";
    const lineTotal = formatDKK(item.unitPrice * item.quantity);
    return `
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:${charcoal};font-family:${font};border-bottom:1px solid ${sand};">
          ${item.name}${qty}
        </td>
        <td style="padding:10px 16px;font-size:14px;color:${charcoal};font-family:${font};border-bottom:1px solid ${sand};text-align:right;white-space:nowrap;">
          ${formatDKK(item.unitPrice)} stk.
        </td>
        <td style="padding:10px 16px;font-size:14px;font-weight:600;color:${charcoal};font-family:${font};border-bottom:1px solid ${sand};text-align:right;white-space:nowrap;">
          ${lineTotal}
        </td>
      </tr>`;
  }).join("");

  const shippingFreeLabel = params.shippingCost === 0
    ? "<span style=\"color:#3A6B4E;font-weight:700;\">Gratis</span>"
    : formatDKK(params.shippingCost);

  const customerRows = [
    params.customerName
      ? `<tr><td style="padding:6px 0;font-size:13px;color:#888;font-family:${font};width:110px;">Navn</td><td style="padding:6px 0;font-size:13px;color:${charcoal};font-family:${font};font-weight:600;">${params.customerName}</td></tr>`
      : "",
    params.customerEmail
      ? `<tr><td style="padding:6px 0;font-size:13px;color:#888;font-family:${font};">E-mail</td><td style="padding:6px 0;font-size:13px;font-family:${font};"><a href="mailto:${params.customerEmail}" style="color:${green};text-decoration:none;">${params.customerEmail}</a></td></tr>`
      : "",
    params.customerPhone
      ? `<tr><td style="padding:6px 0;font-size:13px;color:#888;font-family:${font};">Telefon</td><td style="padding:6px 0;font-size:13px;font-family:${font};"><a href="tel:${params.customerPhone.replace(/\s/g, "")}" style="color:${charcoal};text-decoration:none;font-weight:600;">${params.customerPhone}</a></td></tr>`
      : "",
    `<tr><td style="padding:6px 0;font-size:13px;color:#888;font-family:${font};">Levering</td><td style="padding:6px 0;font-size:13px;color:${charcoal};font-family:${font};">${shippingLabel(params.shippingMethod)}</td></tr>`,
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ny ordre #${params.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f0;font-family:${font};">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f0;padding:32px 20px;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde0da;">

        <!-- ── Internal header ── -->
        <tr>
          <td style="background:${charcoal};padding:18px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.5px;font-family:${font};">
                    PHONESPOT &mdash; INTERN ORDRENOTIFIKATION
                  </p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:12px;color:#aaa;font-family:${font};">
                    info@phonespot.dk
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Order title ── -->
        <tr>
          <td style="padding:28px 28px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 2px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${green};font-family:${font};">
                    Ny ordre
                  </p>
                  <p style="margin:0;font-size:24px;font-weight:800;color:${charcoal};letter-spacing:-0.4px;font-family:${font};">
                    #${params.orderNumber}
                  </p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <!-- Total badge -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:${green};border-radius:8px;padding:10px 18px;text-align:center;">
                        <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.75);font-family:${font};">Total</p>
                        <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;white-space:nowrap;font-family:${font};">
                          ${formatDKK(params.total)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Items table ── -->
        <tr>
          <td style="padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid ${sand};border-radius:8px;overflow:hidden;">
              <!-- Table header -->
              <tr style="background:#f5f5f2;">
                <th style="padding:9px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;font-family:${font};text-align:left;border-bottom:1px solid ${sand};">Produkt</th>
                <th style="padding:9px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;font-family:${font};text-align:right;border-bottom:1px solid ${sand};">Enhedspris</th>
                <th style="padding:9px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;font-family:${font};text-align:right;border-bottom:1px solid ${sand};">Linje total</th>
              </tr>
              <!-- Item rows -->
              ${itemRows}
              <!-- Shipping row -->
              <tr style="background:#fafaf8;">
                <td style="padding:10px 16px;font-size:13px;color:#888;font-family:${font};border-top:1px solid ${sand};" colspan="2">
                  Fragt &mdash; ${shippingLabel(params.shippingMethod)}
                </td>
                <td style="padding:10px 16px;font-size:13px;color:#888;font-family:${font};text-align:right;border-top:1px solid ${sand};white-space:nowrap;">
                  ${shippingFreeLabel}
                </td>
              </tr>
              <!-- Total row -->
              <tr style="background:#f0f7f3;">
                <td style="padding:12px 16px;font-size:14px;font-weight:700;color:${charcoal};font-family:${font};border-top:2px solid ${sand};" colspan="2">
                  Total
                </td>
                <td style="padding:12px 16px;font-size:16px;font-weight:800;color:${green};font-family:${font};text-align:right;border-top:2px solid ${sand};white-space:nowrap;">
                  ${formatDKK(params.total)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Customer info ── -->
        <tr>
          <td style="padding:0 28px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid ${sand};border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:12px 16px;background:#f5f5f2;border-bottom:1px solid ${sand};">
                  <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;font-family:${font};">Kundeoplysninger</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;">
                  <table cellpadding="0" cellspacing="0">
                    ${customerRows}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Se ordre button ── -->
        <tr>
          <td style="padding:0 28px 32px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 auto;">
              <tr>
                <td style="border-radius:8px;background:${green};" align="center">
                  <a
                    href="${adminOrdersUrl}"
                    style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;font-family:${font};"
                  >Se ordre i admin</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#f5f5f2;border-top:1px solid ${sand};padding:14px 28px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#aaa;font-family:${font};">
              PhoneSpot &middot; CVR: ${BRAND.cvr} &middot; ${BRAND.store.address}
              &middot; Intern notifikation &mdash; ikke svar til kunden.
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>`;
}

// ── Sender ─────────────────────────────────────────────────────────────────────

/**
 * Send an HTML staff notification email for a new order.
 * Non-fatal: logs errors but never throws.
 */
export async function sendStaffOrderNotification(
  params: StaffOrderNotificationParams,
): Promise<void> {
  const html = buildStaffNotificationHtml(params);

  // Plain-text fallback
  const itemLines = params.items
    .map((item) => {
      const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
      return `  - ${item.name}${qty} \u2014 ${formatDKK(item.unitPrice * item.quantity)}`;
    })
    .join("\n");

  const textLines = [
    `Ny ordre #${params.orderNumber}`,
    "",
    `Kunde: ${params.customerName}`,
    params.customerEmail ? `Email: ${params.customerEmail}` : null,
    params.customerPhone ? `Tlf: ${params.customerPhone}` : null,
    "",
    "Varer:",
    itemLines,
    "",
    `Fragt: ${shippingLabel(params.shippingMethod)} (${params.shippingCost === 0 ? "Gratis" : formatDKK(params.shippingCost)})`,
    `Total: ${formatDKK(params.total)}`,
    "",
    `Se ordre: https://phonespot.dk/admin/platform/orders`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const { error } = await resend.emails.send({
    from:    EMAIL_FROM,
    to:      STAFF_EMAIL,
    subject: `Ny ordre #${params.orderNumber} \u2014 ${params.customerName} (${formatDKK(params.total)})`,
    html,
    text:    textLines,
  });

  if (error) {
    console.error("[webhook] staff order notification email failed:", error);
  }
}
