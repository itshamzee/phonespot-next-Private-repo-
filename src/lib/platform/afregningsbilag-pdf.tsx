// src/lib/platform/afregningsbilag-pdf.tsx
// React PDF document component for afregningsbilag (purchase receipt)
// Used under the brugtmomsordningen (second-hand VAT scheme, momslovens §70)
// NOTE: No VAT amount is shown — legal requirement under brugtmoms rules.

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AfregningsbilagProps {
  sellerName: string;
  sellerAddress: string;
  documentDate: string; // DD-MM-YYYY
  itemDescription: string;
  purchasePrice: number; // in øre
  documentNumber: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
  },

  // Header bar
  headerBar: {
    backgroundColor: "#f4f4f4",
    paddingVertical: 20,
    paddingHorizontal: 48,
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 4,
  },
  companyMeta: {
    fontSize: 9,
    color: "#555",
    lineHeight: 1.5,
  },

  // Body content wrapper
  body: {
    paddingHorizontal: 48,
  },

  // Document title + meta
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
  },
  documentTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111",
  },
  docMeta: {
    textAlign: "right",
    fontSize: 9,
    color: "#555",
    lineHeight: 1.6,
  },
  docMetaLabel: {
    fontFamily: "Helvetica-Bold",
    color: "#333",
  },

  // Parties section
  partiesRow: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 24,
  },
  partyBox: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },

  // Item table
  tableWrapper: {
    marginBottom: 28,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f4",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d8d8d8",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ebebeb",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  colDescription: {
    flex: 1,
  },
  colPrice: {
    width: 100,
    textAlign: "right",
  },
  cellText: {
    fontSize: 10,
    color: "#1a1a1a",
  },

  // Total row
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: "#bbb",
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#111",
    marginRight: 8,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#111",
    width: 100,
    textAlign: "right",
  },

  // Legal / footer note
  legalBox: {
    marginTop: 36,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  legalText: {
    fontSize: 8.5,
    color: "#555",
    lineHeight: 1.6,
  },
  legalBold: {
    fontFamily: "Helvetica-Bold",
    color: "#333",
  },
  noVatNote: {
    marginTop: 6,
    fontSize: 8,
    color: "#888",
    fontStyle: "italic",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format øre to "1.999,00 kr." using Danish locale conventions (PDF-safe, no Intl) */
function formatDKKPdf(oere: number): string {
  const kroner = oere / 100;
  // Manual Danish number formatting (Intl not available in react-pdf renderer context)
  const [intPart, decPart = "00"] = kroner.toFixed(2).split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const paddedDec = decPart.padEnd(2, "0").slice(0, 2);
  return `${formattedInt},${paddedDec} kr.`;
}

// ─── Document component ───────────────────────────────────────────────────────

export function AfregningsbilagDocument(props: AfregningsbilagProps) {
  const {
    sellerName,
    sellerAddress,
    documentDate,
    itemDescription,
    purchasePrice,
    documentNumber,
  } = props;

  const priceFormatted = formatDKKPdf(purchasePrice);

  return (
    <Document
      title={`Afregningsbilag ${documentNumber}`}
      author="PhoneSpot ApS"
      creator="PhoneSpot Platform"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header bar ── */}
        <View style={styles.headerBar}>
          <Text style={styles.companyName}>PhoneSpot ApS</Text>
          <Text style={styles.companyMeta}>
            CVR: 44138827{"  "}|{"  "}Schweizerpladsen 5, 4200 Slagelse
          </Text>
        </View>

        <View style={styles.body}>
          {/* ── Title + doc meta ── */}
          <View style={styles.titleRow}>
            <Text style={styles.documentTitle}>Afregningsbilag</Text>
            <View>
              <Text style={styles.docMeta}>
                <Text style={styles.docMetaLabel}>Nr.: </Text>
                {documentNumber}
              </Text>
              <Text style={styles.docMeta}>
                <Text style={styles.docMetaLabel}>Dato: </Text>
                {documentDate}
              </Text>
            </View>
          </View>

          {/* ── Parties ── */}
          <View style={styles.partiesRow}>
            {/* Seller */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>Sælger</Text>
              <Text style={styles.partyName}>{sellerName}</Text>
              <Text style={styles.partyDetail}>{sellerAddress}</Text>
            </View>

            {/* Buyer */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>Køber</Text>
              <Text style={styles.partyName}>PhoneSpot ApS</Text>
              <Text style={styles.partyDetail}>
                CVR: 44138827{"\n"}
                Schweizerpladsen 5{"\n"}
                4200 Slagelse
              </Text>
            </View>
          </View>

          {/* ── Item table ── */}
          <View style={styles.tableWrapper}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>
                Beskrivelse
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>
                Købspris
              </Text>
            </View>

            {/* Single item row */}
            <View style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colDescription]}>
                {itemDescription}
              </Text>
              <Text style={[styles.cellText, styles.colPrice]}>
                {priceFormatted}
              </Text>
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>I alt:</Text>
              <Text style={styles.totalValue}>{priceFormatted}</Text>
            </View>
          </View>

          {/* ── Legal text ── */}
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>
              <Text style={styles.legalBold}>Juridisk note: </Text>
              Købt med henblik på videresalg under brugtmomsordningen jf.
              momslovens §70.
            </Text>
            <Text style={styles.noVatNote}>
              Dette dokument indeholder ikke momsoplysninger, da salget sker
              under brugtmomsordningen. Moms beregnes ikke på
              afregningsbilag til privatsælger.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
