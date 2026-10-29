import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { THREE_FOR_TWO_LABEL } from "@/lib/lagersalg/three-for-two";

/**
 * POS Receipt PDF — brugtmoms-compliant.
 *
 * Key legal requirements:
 * - Brugtmoms items must NOT show VAT breakdown
 * - Must state "Brugtmomsordning — køber har ikke fradragsret for moms"
 * - Regular VAT items show 25% moms normally
 * - All prices are inkl. moms per Prismærkningsloven
 */

const MM_TO_PT = 2.835;
const RECEIPT_WIDTH = 80 * MM_TO_PT; // Standard 80mm thermal receipt

const styles = StyleSheet.create({
  page: {
    width: RECEIPT_WIDTH,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontFamily: "Helvetica",
    fontSize: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
  },
  storeName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  storeInfo: {
    fontSize: 7,
    color: "#666",
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    borderStyle: "dashed",
    marginVertical: 6,
  },
  receiptNumber: {
    fontSize: 7,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  itemName: {
    fontSize: 8,
    maxWidth: "70%",
  },
  itemPrice: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  itemDetail: {
    fontSize: 6,
    color: "#666",
    marginBottom: 3,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalPrice: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  paymentMethod: {
    fontSize: 8,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  brugtmomsNotice: {
    fontSize: 6,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    fontStyle: "italic",
  },
  warrantyNotice: {
    fontSize: 7,
    color: "#333",
    marginTop: 6,
    textAlign: "center",
  },
  footer: {
    marginTop: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 6,
    color: "#999",
    textAlign: "center",
  },
});

export const LAGERSALG_RETURN_NOTICE = "Lagersalgsvarer tages ikke retur. Reklamationsretten gælder ved fejl.";

type ReceiptItem = {
  name: string;
  grade?: string;
  /** True for graded devices (drives the 36-month warranty notice). */
  isDevice?: boolean;
  quantity: number; // negative on credit notes
  unitPrice: number; // oere, inkl. moms
  lineTotal: number; // oere, before discount
  vatScheme: "brugtmoms" | "regular";
  /** Repair-case lines: no reklamationsret notice, deposit notice instead. */
  kind?: "deposit" | "deposit_applied" | "repair_service";
  /** Lagersalgsvare (udsalg): no return, reklamationsret still applies. */
  lagersalg?: boolean;
};

export type ReceiptPayment = { label: string; amount: number; reference?: string | null };

export type PosReceiptProps = {
  receiptNumber: string;
  date: string;
  locationName: string;
  locationAddress: string;
  registerName?: string;
  staffName: string;
  items: ReceiptItem[];
  subtotal: number; // oere
  discountAmount: number; // oere (negative on credit notes)
  discountReason?: string | null;
  /** Lagersalg 3 for 2, oere (shown as its own row when not 0). */
  bundleDiscountAmount: number;
  total: number; // oere (negative on credit notes)
  payments: ReceiptPayment[];
  /** Fallback label for legacy sales without payment lines. */
  legacyPaymentLabel?: string;
  customerName?: string;
  hasBrugtmomsItems: boolean;
  hasRegularVatItems: boolean;
  /** Any lagersalgsvare on the sale: prints the no-return notice (not on credit notes). */
  hasLagersalgItems: boolean;
  /** Standard 25 % VAT included in the total (stored on the order). */
  vatTotal?: number;
  isCreditNote?: boolean;
  originalReceiptNumber?: string | null;
  creditReason?: string | null;
};

function formatPrice(oere: number): string {
  return (oere / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Rough number of wrapped lines for 8pt text in a column of ~30 characters. */
function lineCount(text: string, charsPerLine = 30): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/**
 * Page height in points. @react-pdf/layout 4.x loops forever on a page without
 * a height (size: { width }), which hung every Kasse sale, so the receipt gets
 * an explicit height estimated generously from its content.
 */
export function receiptHeight(receipt: PosReceiptProps): number {
  const credit = !!receipt.isCreditNote;
  let h = 24 + 60 + 4 * 14; // padding, header, dividers
  h += 13 * (3 + (credit && receipt.originalReceiptNumber ? 1 : 0) + (receipt.customerName ? 1 : 0));
  for (const item of receipt.items) {
    h += 11 * lineCount(`${item.name}${item.grade ? ` (${item.grade})` : ""}`) + 2;
    if (Math.abs(item.quantity) > 1) h += 11;
  }
  if (receipt.discountAmount !== 0) h += 26;
  if (receipt.bundleDiscountAmount !== 0) h += 26;
  h += 20 + 12; // total, VAT line
  h += 16;
  for (const p of receipt.payments) h += 11 * lineCount(`${p.label}${p.reference ? ` (${p.reference})` : ""}`) + 2;
  if (credit && receipt.creditReason) h += 10 * lineCount(receipt.creditReason, 45) + 6;
  h += 3 * 26; // brugtmoms, warranty and deposit notices
  if (!credit && receipt.hasLagersalgItems) h += 26;
  h += 40; // footer
  return Math.ceil(h * 1.1);
}

export function PosReceiptPDF({ receipt }: { receipt: PosReceiptProps }) {
  const credit = !!receipt.isCreditNote;
  const vatAmount = receipt.vatTotal ?? 0;

  return (
    <Document>
      <Page size={{ width: RECEIPT_WIDTH, height: receiptHeight(receipt) }} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.storeName}>PhoneSpot</Text>
          <Text style={styles.storeInfo}>{receipt.locationName}</Text>
          <Text style={styles.storeInfo}>{receipt.locationAddress}</Text>
          <Text style={styles.storeInfo}>CVR: 44588819</Text>
        </View>

        <View style={styles.divider} />

        {/* Receipt meta */}
        <Text style={styles.receiptNumber}>
          {credit ? "Kreditnota" : "Kvittering"} {receipt.receiptNumber}
        </Text>
        {credit && receipt.originalReceiptNumber ? (
          <Text style={styles.receiptNumber}>
            Vedr. kvittering {receipt.originalReceiptNumber}
          </Text>
        ) : null}
        <Text style={styles.receiptNumber}>{formatDate(receipt.date)}</Text>
        <Text style={styles.receiptNumber}>
          {receipt.registerName ? `${receipt.registerName} · ` : ""}Ekspedient: {receipt.staffName}
        </Text>
        {receipt.customerName && (
          <Text style={styles.receiptNumber}>Kunde: {receipt.customerName}</Text>
        )}

        <View style={styles.divider} />

        {/* Items */}
        {receipt.items.map((item, i) => (
          <View key={i}>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.name}
                {item.grade ? ` (${item.grade})` : ""}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(item.lineTotal)}</Text>
            </View>
            {Math.abs(item.quantity) > 1 && (
              <Text style={styles.itemDetail}>
                {item.quantity} x {formatPrice(item.unitPrice)}
              </Text>
            )}
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        {(receipt.discountAmount !== 0 || receipt.bundleDiscountAmount !== 0) && (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>Subtotal</Text>
            <Text style={styles.itemPrice}>{formatPrice(receipt.subtotal)}</Text>
          </View>
        )}
        {receipt.bundleDiscountAmount !== 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{THREE_FOR_TWO_LABEL}</Text>
            <Text style={styles.itemPrice}>{formatPrice(-receipt.bundleDiscountAmount)}</Text>
          </View>
        )}
        {receipt.discountAmount !== 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>
              Rabat{receipt.discountReason ? ` (${receipt.discountReason})` : ""}
            </Text>
            <Text style={styles.itemPrice}>{formatPrice(-receipt.discountAmount)}</Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {credit ? "Tilbagebetalt inkl. moms" : "Total inkl. moms"}
          </Text>
          <Text style={styles.totalPrice}>{formatPrice(receipt.total)} DKK</Text>
        </View>

        {/* VAT breakdown: standard VAT only (brugtmoms is never itemised). */}
        {receipt.hasRegularVatItems && vatAmount !== 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemDetail}>Heraf moms (25%)</Text>
            <Text style={styles.itemDetail}>{formatPrice(vatAmount)} DKK</Text>
          </View>
        )}

        {/* Payment lines */}
        <View style={styles.divider} />
        {receipt.payments.length > 0 ? (
          <>
            <Text style={styles.paymentMethod}>{credit ? "Udbetalt som" : "Betalt med"}</Text>
            {receipt.payments.map((p, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {p.label}
                  {p.reference ? ` (${p.reference})` : ""}
                </Text>
                <Text style={styles.itemPrice}>{formatPrice(Math.abs(p.amount))}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.paymentMethod}>
            {credit ? "Udbetalt" : "Betalt med"}: {receipt.legacyPaymentLabel ?? "-"}
          </Text>
        )}

        {credit && receipt.creditReason ? (
          <Text style={styles.warrantyNotice}>Årsag: {receipt.creditReason}</Text>
        ) : null}

        {/* Brugtmoms notice — required for margin scheme items */}
        {receipt.hasBrugtmomsItems && (
          <Text style={styles.brugtmomsNotice}>
            Varer solgt efter brugtmomsordningen (momslovens §69-71).
            {"\n"}
            Køber har ikke fradragsret for moms.
          </Text>
        )}

        {/* Warranty notice — 36 months applies to devices only; accessory-only
            receipts get the statutory reklamationsret. Not shown on credit notes. */}
        {!credit &&
          (receipt.items.some((item) => item.isDevice) ? (
            <Text style={styles.warrantyNotice}>
              Enheder leveres med 36 måneders garanti.
              {"\n"}
              Garantibevis sendes til din email.
            </Text>
          ) : receipt.items.some((item) => item.vatScheme === "regular" && !item.isDevice && !item.kind) ? (
            <Text style={styles.warrantyNotice}>2 års reklamationsret efter købeloven.</Text>
          ) : null)}

        {/* Lagersalg: sold as clearance, no return right; reklamationsret still applies. */}
        {!credit && receipt.hasLagersalgItems && (
          <Text style={styles.warrantyNotice}>{LAGERSALG_RETURN_NOTICE}</Text>
        )}

        {/* Deposit: a prepayment on a repair case. VAT is included above (due on receipt). */}
        {!credit && receipt.items.some((item) => item.kind === "deposit") && (
          <Text style={styles.warrantyNotice}>
            Depositum er en forudbetaling på din reparation.
            {"\n"}
            Beløbet fratrækkes, når du afhenter og betaler resten.
          </Text>
        )}
        {!credit && receipt.items.some((item) => item.kind === "deposit_applied") && (
          <Text style={styles.warrantyNotice}>Tidligere indbetalt depositum er fratrukket.</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>PhoneSpot · phonespot.dk · hej@phonespot.dk</Text>
          <Text style={styles.footerText}>{credit ? "Kreditnota er bogført" : "Tak for dit køb!"}</Text>
        </View>
      </Page>
    </Document>
  );
}
