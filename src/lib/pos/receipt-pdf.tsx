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
  quantity: number;
  unitPrice: number; // øre, inkl. moms
  lineTotal: number; // øre
  vatScheme: "brugtmoms" | "regular";
};

type PosReceiptProps = {
  receiptNumber: string;
  date: string;
  locationName: string;
  locationAddress: string;
  staffName: string;
  items: ReceiptItem[];
  subtotal: number; // øre
  discountAmount: number; // øre
  total: number; // øre
  paymentMethod: string;
  customerName?: string;
  hasBrugtmomsItems: boolean;
  hasRegularVatItems: boolean;
  regularVatTotal?: number; // øre — total of regular VAT items
};

function formatPrice(øre: number): string {
  return (øre / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const PAYMENT_LABELS: Record<string, string> = {
  card: "Kort (Dankort/Visa)",
  cash: "Kontant",
  mobilepay: "MobilePay",
};

export function PosReceiptPDF({ receipt }: { receipt: PosReceiptProps }) {
  const regularVatAmount = receipt.regularVatTotal
    ? Math.round(receipt.regularVatTotal * 0.2) // 25/125 of total = 0.2
    : 0;

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
          Kvittering {receipt.receiptNumber}
        </Text>
        <Text style={styles.receiptNumber}>
          {formatDate(receipt.date)} · {receipt.staffName}
        </Text>
        {receipt.customerName && (
          <Text style={styles.receiptNumber}>
            Kunde: {receipt.customerName}
          </Text>
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
              <Text style={styles.itemPrice}>
                {formatPrice(item.lineTotal)}
              </Text>
            </View>
            {item.quantity > 1 && (
              <Text style={styles.itemDetail}>
                {item.quantity} x {formatPrice(item.unitPrice)}
              </Text>
            )}
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        {receipt.discountAmount > 0 && (
          <>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Subtotal</Text>
              <Text style={styles.itemPrice}>{formatPrice(receipt.subtotal)}</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Rabat</Text>
              <Text style={styles.itemPrice}>-{formatPrice(receipt.discountAmount)}</Text>
            </View>
          </>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total inkl. moms</Text>
          <Text style={styles.totalPrice}>{formatPrice(receipt.total)} DKK</Text>
        </View>

        {/* VAT breakdown — ONLY for regular VAT items */}
        {receipt.hasRegularVatItems && regularVatAmount > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemDetail}>Heraf moms (25%)</Text>
            <Text style={styles.itemDetail}>{formatPrice(regularVatAmount)} DKK</Text>
          </View>
        )}

        {/* Payment method */}
        <Text style={styles.paymentMethod}>
          Betalt med: {PAYMENT_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}
        </Text>

        {/* Brugtmoms notice — required for margin scheme items */}
        {receipt.hasBrugtmomsItems && (
          <Text style={styles.brugtmomsNotice}>
            Varer solgt efter brugtmomsordningen (momslovens §69-71).{"\n"}
            Køber har ikke fradragsret for moms.
          </Text>
        )}

        {/* Warranty notice */}
        <Text style={styles.warrantyNotice}>
          Enheder leveres med 36 måneders garanti.{"\n"}
          Garantibevis sendes til din email.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PhoneSpot · phonespot.dk · hej@phonespot.dk
          </Text>
          <Text style={styles.footerText}>
            Tak for dit køb!
          </Text>
        </View>
      </Page>
    </Document>
  );
}
