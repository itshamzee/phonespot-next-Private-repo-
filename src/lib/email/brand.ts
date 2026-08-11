// ─────────────────────────────────────────────────────────────────────────────
// PhoneSpot shared email branding constants and HTML helpers
// All HTML is email-safe: tables, inline styles, no CSS classes.
// ─────────────────────────────────────────────────────────────────────────────

import { STORES } from "@/lib/store-config";
import { isDeviceCategory } from "@/lib/collections";

const slagelseAddress = `${STORES.slagelse.street}, ${STORES.slagelse.zip} ${STORES.slagelse.city}`;
const vejleAddress = `${STORES.vejle.street}, ${STORES.vejle.zip} ${STORES.vejle.city}`;

export const BRAND = {
  // Colors
  green: "#3A6B4E",       // PhoneSpot dark green — header, primary buttons
  greenLight: "#5A8C6F",  // Lighter green accent
  charcoal: "#3A3D38",    // Primary text
  warmWhite: "#F5F2EC",   // Page background
  sand: "#EAE5DB",        // Borders / dividers

  // Contact
  phone: "61 10 00 48",
  email: "info@phonespot.dk",
  orderEmail: "info@phonespot.dk",
  website: "https://phonespot.dk",
  cvr: "38688766",

  // Social
  facebook: "https://www.facebook.com/phonespot.dk/",
  trustpilot: "https://dk.trustpilot.com/review/phonespot.dk",

  // Logo
  logoWhite: "https://phonespot.dk/brand/logos/phonespot-wordmark-white.png",
  logoDark:  "https://phonespot.dk/brand/logos/phonespot-wordmark-dark.png",

  // Stores — render both in email footers
  stores: [
    {
      name:    "PhoneSpot Slagelse",
      address: slagelseAddress,
      hours:   "Man-Fre 10-19 · Lør-Søn 10-17",
    },
    {
      name:    "PhoneSpot Vejle",
      address: vejleAddress,
      hours:   "Man-Fre 10-17:30 · Lør-Søn 10-15",
    },
  ],

  // Backwards-compat single-store reference (used by older templates)
  store: {
    name:    "PhoneSpot Slagelse",
    address: slagelseAddress,
    hours:   "Man-Fre 10-19 · Lør-Søn 10-17",
  },

  // USPs
  usps: [
    "36 mdr. garanti",
    "14 dages returret",
    "30+ kvalitetstests",
    "Gratis afhentning i butik",
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Order-aware guarantee wording
//
// PhoneSpot's 36-month commercial guarantee only covers graded refurbished
// devices — accessories and spare parts carry the statutory 2-year
// reklamationsret (købeloven) instead, never a "garanti". An email whose
// order/cart is accessory-only must not print "36 mdr. garanti" in its USP
// bar/footer: that is a written, binding commercial claim PhoneSpot will not
// honour on e.g. a leather case.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal per-item shape needed to decide guarantee wording. `category`
 *  is `sku_products.category` — required because a `sku_product` item can
 *  itself be a graded device (see DEVICE_CATEGORIES in lib/collections.ts),
 *  so `itemType === "sku_product"` must NOT be treated as "accessory". */
export interface GuaranteeQualifyingItem {
  itemType: "device" | "sku_product";
  category?: string | null;
}

/**
 * True when at least one item is a graded refurbished device — the only
 * thing the 36-month guarantee covers. Missing/empty/unknown items resolve
 * to `false` (the safe default): an email that doesn't know what's in the
 * order must never over-claim the guarantee.
 */
export function hasGuaranteeQualifyingDevice(
  items: readonly GuaranteeQualifyingItem[] | null | undefined,
): boolean {
  if (!items || items.length === 0) return false;
  return items.some(
    (item) => item.itemType === "device" || isDeviceCategory(item.category),
  );
}

/** Correct legal wording for the guarantee USP slot. */
export function guaranteeUspLabel(hasDevice: boolean): string {
  return hasDevice ? "36 mdr. garanti" : "2 års reklamationsret";
}

/**
 * `BRAND.usps` with the guarantee line swapped to match what's actually in
 * the order/cart. Use this (instead of `BRAND.usps` directly) in any email
 * that lists real purchased items.
 */
export function uspsForOrder(hasDevice: boolean): string[] {
  return BRAND.usps.map((usp) =>
    usp === "36 mdr. garanti" ? guaranteeUspLabel(hasDevice) : usp,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// emailHeader
// Dark-green bar with the white PhoneSpot wordmark centered.
// ─────────────────────────────────────────────────────────────────────────────
export function emailHeader(): string {
  return `
    <tr>
      <td style="background:${BRAND.green};padding:28px 40px;text-align:center;">
        <a href="${BRAND.website}" style="text-decoration:none;">
          <img
            src="${BRAND.logoWhite}"
            alt="PhoneSpot"
            height="34"
            style="height:34px;display:inline-block;"
          />
        </a>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// emailFooter
// 1. USP bar with green check marks
// 2. Store info + opening hours
// 3. Phone + email
// 4. Facebook + Trustpilot links
// 5. Legal / CVR line
// 6. Unsubscribe notice
// ─────────────────────────────────────────────────────────────────────────────
export function emailFooter(usps: readonly string[] = BRAND.usps): string {
  const uspItems = usps
    .map(
      (usp) => `
        <td style="padding:0 12px;text-align:center;vertical-align:top;font-size:12px;color:${BRAND.charcoal};white-space:nowrap;">
          <span style="color:${BRAND.greenLight};font-size:15px;font-weight:700;margin-right:4px;">&#10003;</span>${usp}
        </td>`
    )
    .join("\n");

  return `
    <!-- Divider -->
    <tr>
      <td style="padding:32px 40px 0;">
        <div style="border-top:1px solid ${BRAND.sand};"></div>
      </td>
    </tr>

    <!-- USP bar -->
    <tr>
      <td style="padding:20px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${uspItems}
          </tr>
        </table>
      </td>
    </tr>

    <!-- Store info + hours — both locations -->
    <tr>
      <td style="padding:20px 40px 4px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${BRAND.stores
              .map(
                (s, i) => `
              <td style="width:50%;padding:0 ${i === 0 ? "8px 0 0" : "0 0 8px"};vertical-align:top;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;color:${BRAND.charcoal};font-weight:600;">
                  ${s.name}
                </p>
                <p style="margin:0 0 2px;font-size:12px;color:#888;line-height:1.5;">
                  ${s.address}
                </p>
                <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">
                  ${s.hours}
                </p>
              </td>`
              )
              .join("\n")}
          </tr>
        </table>
      </td>
    </tr>

    <!-- Phone + email -->
    <tr>
      <td style="padding:8px 40px 4px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#888;">
          <a href="tel:+4561100048" style="color:${BRAND.charcoal};text-decoration:none;font-weight:600;">${BRAND.phone}</a>
          &nbsp;&middot;&nbsp;
          <a href="mailto:${BRAND.email}" style="color:${BRAND.greenLight};text-decoration:none;">${BRAND.email}</a>
        </p>
      </td>
    </tr>

    <!-- Social links -->
    <tr>
      <td style="padding:10px 40px 4px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="display:inline-table;">
          <tr>
            <!-- Facebook -->
            <td style="padding:0 8px;">
              <a href="${BRAND.facebook}" style="text-decoration:none;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#1877F2;border-radius:4px;padding:5px 10px;font-size:12px;color:#ffffff;font-weight:600;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                      &#x66; Facebook
                    </td>
                  </tr>
                </table>
              </a>
            </td>
            <!-- Trustpilot -->
            <td style="padding:0 8px;">
              <a href="${BRAND.trustpilot}" style="text-decoration:none;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#00B67A;border-radius:4px;padding:5px 10px;font-size:12px;color:#ffffff;font-weight:600;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                      &#9733; Trustpilot
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Legal -->
    <tr>
      <td style="padding:12px 40px 4px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#aaa;">
          PhoneSpot &middot; CVR: ${BRAND.cvr}
        </p>
      </td>
    </tr>

    <!-- Unsubscribe -->
    <tr>
      <td style="padding:4px 40px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#bbb;">
          Denne e-mail er sendt i forbindelse med din handel hos PhoneSpot.
          Du kan til enhver tid kontakte os på
          <a href="mailto:${BRAND.email}" style="color:#bbb;text-decoration:underline;">${BRAND.email}</a>
          for at afmelde transaktionsmails.
        </p>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// emailButton
// Full-width (or auto) branded CTA button.
// ─────────────────────────────────────────────────────────────────────────────
export function emailButton(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="border-radius:8px;background:${BRAND.green};" align="center">
          <a
            href="${url}"
            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"
          >${text}</a>
        </td>
      </tr>
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// emailItemRow
// Single product row for an order / offer summary table.
// Renders an optional 56 × 56 px thumbnail on the left.
// ─────────────────────────────────────────────────────────────────────────────
export interface EmailItemRowInput {
  title: string;
  quantity: number;
  /** Price in øre (integer, e.g. 149900 = 1 499,00 kr.) */
  price: number;
  image?: string;
}

function formatOereLocal(oere: number): string {
  const kr = oere / 100;
  return (
    new Intl.NumberFormat("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(kr) + " kr."
  );
}

export function emailItemRow(item: EmailItemRowInput): string {
  const qtyLabel = item.quantity > 1 ? ` &times;${item.quantity}` : "";
  const priceLabel = formatOereLocal(item.price);

  const thumbnailCell = item.image
    ? `
        <td width="64" style="padding:10px 12px 10px 0;vertical-align:top;">
          <img
            src="${item.image}"
            alt="${item.title}"
            width="56"
            height="56"
            style="width:56px;height:56px;object-fit:cover;border-radius:6px;display:block;border:1px solid ${BRAND.sand};"
          />
        </td>`
    : "";

  return `
    <tr>
      ${thumbnailCell}
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.sand};vertical-align:middle;font-size:14px;color:${BRAND.charcoal};">
        ${item.title}${qtyLabel}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.sand};vertical-align:middle;font-size:14px;color:${BRAND.charcoal};text-align:right;white-space:nowrap;">
        ${priceLabel}
      </td>
    </tr>`;
}
