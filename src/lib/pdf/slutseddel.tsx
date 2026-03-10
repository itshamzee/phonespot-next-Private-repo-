import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { TradeInReceipt, TradeInReceiptItem } from "@/lib/supabase/trade-in-types";

const c = {
  charcoal: "#3A3D38",
  green: "#5A8C6F",
  gray: "#666666",
  lightGray: "#E5E5E5",
  bg: "#FAFAFA",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: c.charcoal },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: c.green },
  headerRight: { alignItems: "flex-end" },
  receiptNum: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  date: { fontSize: 10, color: c.gray },
  // Parties
  partiesRow: { flexDirection: "row", marginBottom: 24, gap: 20 },
  partyBox: { flex: 1, padding: 12, backgroundColor: c.bg, borderRadius: 4 },
  partyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.green, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  partyLine: { fontSize: 9, color: c.gray, marginBottom: 2 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: c.charcoal, padding: 8, borderRadius: 4 },
  tableHeaderText: { color: c.white, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: c.lightGray },
  tableCell: { fontSize: 9 },
  // Column widths
  colNum: { width: 24 },
  colImei: { width: 110 },
  colBrand: { width: 70 },
  colModel: { width: 90 },
  colStorage: { width: 55 },
  colGrade: { width: 55 },
  colPrice: { width: 70, textAlign: "right" as const },
  // Total
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, paddingRight: 8 },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", marginRight: 20 },
  totalAmount: { fontSize: 12, fontFamily: "Helvetica-Bold", color: c.green },
  // Bank
  bankSection: { marginTop: 20, padding: 12, backgroundColor: c.bg, borderRadius: 4 },
  bankLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.green, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 },
  bankRow: { flexDirection: "row", gap: 40 },
  bankItem: { fontSize: 9, color: c.gray },
  bankValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  // Footer
  footer: { marginTop: 30, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.lightGray },
  legalText: { fontSize: 7.5, color: c.gray, marginBottom: 4, lineHeight: 1.4 },
  signatureRow: { flexDirection: "row", marginTop: 24, gap: 40 },
  signatureLine: { flex: 1, borderTopWidth: 1, borderTopColor: c.charcoal, paddingTop: 4 },
  signatureLabel: { fontSize: 8, color: c.gray },
  staffLine: { marginTop: 16, fontSize: 8, color: c.gray },
});

function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ore / 100) + " kr";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface SlutseddelProps {
  receipt: TradeInReceipt;
  items: TradeInReceiptItem[];
}

export function SlutseddelDocument({ receipt, items }: SlutseddelProps) {
  const isShipping = receipt.delivery_method === "shipping";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>SLUTSEDDEL</Text>
          <View style={s.headerRight}>
            <Text style={s.receiptNum}>{receipt.receipt_number}</Text>
            <Text style={s.date}>{formatDate(receipt.confirmed_at || receipt.created_at)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Køber</Text>
            <Text style={s.partyName}>{receipt.buyer_company}</Text>
            <Text style={s.partyLine}>CVR: {receipt.buyer_cvr}</Text>
            {receipt.buyer_address && <Text style={s.partyLine}>{receipt.buyer_address}</Text>}
            {receipt.buyer_postal_city && <Text style={s.partyLine}>{receipt.buyer_postal_city}</Text>}
            <Text style={s.partyLine}>{receipt.buyer_email}</Text>
            {receipt.buyer_phone && <Text style={s.partyLine}>Tlf: {receipt.buyer_phone}</Text>}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Sælger</Text>
            <Text style={s.partyName}>{receipt.seller_name}</Text>
            {receipt.seller_address && <Text style={s.partyLine}>{receipt.seller_address}</Text>}
            {receipt.seller_postal_city && <Text style={s.partyLine}>{receipt.seller_postal_city}</Text>}
            {receipt.seller_phone && <Text style={s.partyLine}>Tlf: {receipt.seller_phone}</Text>}
            {receipt.seller_email && <Text style={s.partyLine}>{receipt.seller_email}</Text>}
          </View>
        </View>

        {/* Device Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNum]}>#</Text>
          <Text style={[s.tableHeaderText, s.colImei]}>IMEI/Serienr.</Text>
          <Text style={[s.tableHeaderText, s.colBrand]}>Fabrikant</Text>
          <Text style={[s.tableHeaderText, s.colModel]}>Model</Text>
          <Text style={[s.tableHeaderText, s.colStorage]}>Lagerplads</Text>
          <Text style={[s.tableHeaderText, s.colGrade]}>Stand</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>Pris</Text>
        </View>
        {items.map((item, i) => (
          <View key={item.id} style={s.tableRow}>
            <Text style={[s.tableCell, s.colNum]}>{i + 1}</Text>
            <Text style={[s.tableCell, s.colImei]}>{item.imei_serial || "—"}</Text>
            <Text style={[s.tableCell, s.colBrand]}>{item.brand}</Text>
            <Text style={[s.tableCell, s.colModel]}>{item.model}</Text>
            <Text style={[s.tableCell, s.colStorage]}>{item.storage || "—"}</Text>
            <Text style={[s.tableCell, s.colGrade]}>{item.condition_grade || "—"}</Text>
            <Text style={[s.tableCell, s.colPrice]}>{formatDKK(item.price)}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total:</Text>
          <Text style={s.totalAmount}>{formatDKK(receipt.total_amount)}</Text>
        </View>

        {/* Bank Details */}
        {(receipt.seller_bank_reg || receipt.seller_bank_account) && (
          <View style={s.bankSection}>
            <Text style={s.bankLabel}>Sælgers bankoplysninger</Text>
            <View style={s.bankRow}>
              <Text style={s.bankItem}>Reg.nr: <Text style={s.bankValue}>{receipt.seller_bank_reg || "—"}</Text></Text>
              <Text style={s.bankItem}>Kontonr: <Text style={s.bankValue}>{receipt.seller_bank_account || "—"}</Text></Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.legalText}>
            Sælger bekræfter at ovenstående enhed(er) er sælgers ejendom og ikke er stjålet eller pansat.
          </Text>
          <Text style={s.legalText}>
            Køb sker i henhold til brugtmomsordningen jf. momslovens §70.
          </Text>

          {isShipping ? (
            <Text style={[s.legalText, { marginTop: 12 }]}>
              Digital bekræftelse modtaget {receipt.confirmed_at ? formatDate(receipt.confirmed_at) : "—"}
            </Text>
          ) : (
            <View style={s.signatureRow}>
              <View style={s.signatureLine}>
                <Text style={s.signatureLabel}>Sælgers underskrift</Text>
              </View>
              <View style={s.signatureLine}>
                <Text style={s.signatureLabel}>Købers underskrift</Text>
              </View>
            </View>
          )}

          {receipt.staff_initials && (
            <Text style={s.staffLine}>Behandlet af: {receipt.staff_initials}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
