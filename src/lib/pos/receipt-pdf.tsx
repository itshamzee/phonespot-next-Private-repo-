import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

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

type ReceiptItem = {
  name: string;
  grade?: string;
  /** True for graded devices (drives the 36-month warranty notice). */
  isDevice?: boolean;
  quantity: number; // negative on credit notes
  unitPrice: number; // oere, inkl. moms
  lineTotal: number; // oere, before discount
  vatScheme: "brugtmoms" | "regular";
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
  total: number; // oere (negative on credit notes)
  payments: ReceiptPayment[];
  /** Fallback label for legacy sales without payment lines. */
  legacyPaymentLabel?: string;
  customerName?: string;
  hasBrugtmomsItems: boolean;
  hasRegularVatItems: boolean;
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

export function PosReceiptPDF({ receipt }: { receipt: PosReceiptProps }) {
  const credit = !!receipt.isCreditNote;
  const vatAmount = receipt.vatTotal ?? 0;

  return (
    <Document>
      <Page size={{ width: RECEIPT_WIDTH }} style={styles.page}>
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
        {receipt.discountAmount !== 0 && (
          <>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Subtotal</Text>
              <Text style={styles.itemPrice}>{formatPrice(receipt.subtotal)}</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>
                Rabat{receipt.discountReason ? ` (${receipt.discountReason})` : ""}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(-receipt.discountAmount)}</Text>
            </View>
          </>
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
          ) : receipt.items.some((item) => item.vatScheme === "regular" && !item.isDevice) ? (
            <Text style={styles.warrantyNotice}>2 års reklamationsret efter købeloven.</Text>
          ) : null)}

        <View style={styles.footer}>
          <Text style={styles.footerText}>PhoneSpot · phonespot.dk · hej@phonespot.dk</Text>
          <Text style={styles.footerText}>{credit ? "Kreditnota er bogført" : "Tak for dit køb!"}</Text>
        </View>
      </Page>
    </Document>
  );
}
