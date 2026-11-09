import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const c = {
  charcoal: "#3A3D38",
  green: "#1A3D2E",
  gray: "#666666",
  lightGray: "#E5E5E5",
  bg: "#FAFAFA",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: c.charcoal },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: c.green },
  headerRight: { alignItems: "flex-end" },
  receiptNum: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  date: { fontSize: 10, color: c.gray },
  partiesRow: { flexDirection: "row", marginBottom: 20 },
  partyBox: { flex: 1, padding: 12, backgroundColor: c.bg, borderRadius: 4 },
  partyGap: { width: 16 },
  partyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.green, marginBottom: 8 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  partyLine: { fontSize: 9, color: c.gray, marginBottom: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: c.charcoal, padding: 6, borderRadius: 4 },
  tableHeaderText: { color: c.white, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: c.lightGray },
  tableCell: { fontSize: 9 },
  colNum: { width: 20 },
  colModel: { width: 110 },
  colStorage: { width: 50 },
  colImei: { width: 100 },
  colGrade: { width: 55 },
  colBattery: { width: 45 },
  colPrice: { width: 75, textAlign: "right" as const },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10, paddingRight: 6 },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", marginRight: 20 },
  totalAmount: { fontSize: 12, fontFamily: "Helvetica-Bold", color: c.green },
  vatNote: { fontSize: 8, color: c.gray, textAlign: "right" as const, marginTop: 2, paddingRight: 6 },
  infoSection: { marginTop: 14, padding: 10, backgroundColor: c.bg, borderRadius: 4 },
  infoLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.green, marginBottom: 4 },
  infoText: { fontSize: 9, color: c.charcoal },
  footer: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.lightGray },
  legalText: { fontSize: 8, color: c.gray, marginBottom: 4, lineHeight: 1.4 },
  signatureRow: { flexDirection: "row", marginTop: 34 },
  signatureLine: { flex: 1, borderTopWidth: 1, borderTopColor: c.charcoal, paddingTop: 4 },
  signatureLabel: { fontSize: 8, color: c.gray },
});

export const ATTESTATION_TEXT =
  "Sælger bekræfter at være fyldt 18 år, at være ejer af enhederne, at de ikke er stjålne, pantsatte eller under afbetaling, og at Find My/iCloud er slået fra.";
export const PRIVACY_TEXT =
  "Vi gemmer dine oplysninger efter lov om handel med brugte genstande og bogføringsloven. ID-oplysninger slettes efter 5 år. Læs mere på phonespot.dk/privatlivspolitik.";
export const NO_VAT_TEXT = "Beløbet indeholder ikke moms.";
export const ID_NOT_REQUIRED_TEXT = "Ikke påkrævet (under 2.000 kr.)";

const ID_TYPE_LABELS: Record<string, string> = {
  pas: "Pas",
  koerekort: "Kørekort",
  id_kort: "ID-kort",
  mitid: "MitID",
};
const INVOICE_TYPE_LABELS: Record<string, string> = {
  med_moms: "Faktura med moms",
  brugtmoms: "Brugtmoms",
  eu_normal: "EU, normal",
};

export type SlutseddelItem = {
  model: string;
  storage: string | null;
  imei_serial: string | null;
  condition_grade: string | null;
  battery_health: number | null;
  /** Hele øre */
  price: number;
};

/** Alt, der står på sedlen. ID-nummer og kontonummer leveres i klartekst og maskeres først af dokumentet. */
export type SlutseddelData = {
  receipt_number: string;
  /** ISO-tidspunkt for bekræftelsen */
  date: string;
  buyer_company: string;
  buyer_cvr: string;
  /** Det købende selskabs adresse (momsbekendtgørelsen § 122); aldrig Esbjerg-butikkens adresse */
  buyer_address: string | null;
  location_name: string;
  staff_name: string;
  seller_name: string;
  seller_address: string | null;
  seller_postal_city: string | null;
  seller_phone: string | null;
  seller_type: "private" | "business";
  seller_cvr: string | null;
  invoice_type: string | null;
  items: SlutseddelItem[];
  /** Hele øre */
  total_amount: number;
  id_type: string | null;
  id_number: string | null;
  id_expiry: string | null;
  payout_method: "bank" | "modregning" | null;
  seller_bank_reg: string | null;
  seller_bank_account: string | null;
};

/** Sidste fire tegn; er værdien højst fire tegn, vises intet af den. */
const mask = (value: string | null): string | null =>
  value ? (value.length <= 4 ? "••••" : `••••${value.slice(-4)}`) : null;

function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ore / 100) + " kr";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Copenhagen",
  });
}

function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Copenhagen",
  });
}

function idLine(d: SlutseddelData): string {
  if (!d.id_number) return ID_NOT_REQUIRED_TEXT;
  const type = (d.id_type && ID_TYPE_LABELS[d.id_type]) || "ID";
  const expiry = d.id_expiry ? `, udløber ${formatDay(d.id_expiry)}` : "";
  return `${type} ${mask(d.id_number)}${expiry}`;
}

function payoutLine(d: SlutseddelData): string {
  if (d.payout_method === "modregning") return "Modregnes i køb";
  if (d.payout_method === "bank") {
    return `Bank, reg.nr. ${d.seller_bank_reg || "—"}, konto ${mask(d.seller_bank_account) ?? "—"}`;
  }
  return "—";
}

export function SlutseddelDocument({ data }: { data: SlutseddelData }) {
  return (
    <Document title={`Slutseddel ${data.receipt_number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Slutseddel</Text>
          <View style={s.headerRight}>
            <Text style={s.receiptNum}>{data.receipt_number}</Text>
            <Text style={s.date}>{formatDate(data.date)}</Text>
          </View>
        </View>

        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Køber</Text>
            <Text style={s.partyName}>{data.buyer_company}</Text>
            <Text style={s.partyLine}>CVR: {data.buyer_cvr}</Text>
            {data.buyer_address ? <Text style={s.partyLine}>{data.buyer_address}</Text> : null}
            <Text style={s.partyLine}>Butik: {data.location_name}</Text>
            <Text style={s.partyLine}>Medarbejder: {data.staff_name}</Text>
          </View>
          <View style={s.partyGap} />
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Sælger</Text>
            <Text style={s.partyName}>{data.seller_name}</Text>
            {data.seller_address ? <Text style={s.partyLine}>{data.seller_address}</Text> : null}
            {data.seller_postal_city ? <Text style={s.partyLine}>{data.seller_postal_city}</Text> : null}
            {data.seller_phone ? <Text style={s.partyLine}>Tlf: {data.seller_phone}</Text> : null}
            {data.seller_type === "business" ? (
              <>
                <Text style={s.partyLine}>CVR: {data.seller_cvr || "—"}</Text>
                <Text style={s.partyLine}>
                  Fakturatype: {(data.invoice_type && INVOICE_TYPE_LABELS[data.invoice_type]) || "—"}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNum]}>Nr.</Text>
          <Text style={[s.tableHeaderText, s.colModel]}>Model</Text>
          <Text style={[s.tableHeaderText, s.colStorage]}>Lager</Text>
          <Text style={[s.tableHeaderText, s.colImei]}>IMEI/serienr.</Text>
          <Text style={[s.tableHeaderText, s.colGrade]}>Stand</Text>
          <Text style={[s.tableHeaderText, s.colBattery]}>Batteri</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>Pris</Text>
        </View>
        {data.items.map((item, i) => (
          <View key={i} style={s.tableRow} wrap={false}>
            <Text style={[s.tableCell, s.colNum]}>{i + 1}</Text>
            <Text style={[s.tableCell, s.colModel]}>{item.model}</Text>
            <Text style={[s.tableCell, s.colStorage]}>{item.storage || "—"}</Text>
            <Text style={[s.tableCell, s.colImei]}>{item.imei_serial || "—"}</Text>
            <Text style={[s.tableCell, s.colGrade]}>{item.condition_grade || "—"}</Text>
            <Text style={[s.tableCell, s.colBattery]}>
              {item.battery_health != null ? `${item.battery_health} %` : "—"}
            </Text>
            <Text style={[s.tableCell, s.colPrice]}>{formatDKK(item.price)}</Text>
          </View>
        ))}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total:</Text>
          <Text style={s.totalAmount}>{formatDKK(data.total_amount)}</Text>
        </View>
        <Text style={s.vatNote}>{NO_VAT_TEXT}</Text>

        <View style={s.infoSection} wrap={false}>
          <Text style={s.infoLabel}>ID</Text>
          <Text style={s.infoText}>{idLine(data)}</Text>
          <Text style={[s.infoLabel, { marginTop: 8 }]}>Udbetaling</Text>
          <Text style={s.infoText}>{payoutLine(data)}</Text>
        </View>

        <View style={s.footer} wrap={false}>
          <Text style={s.legalText}>{ATTESTATION_TEXT}</Text>
          <View style={s.signatureRow}>
            <View style={s.signatureLine}>
              <Text style={s.signatureLabel}>Sælgers underskrift</Text>
            </View>
            <View style={s.partyGap} />
            <View style={s.signatureLine}>
              <Text style={s.signatureLabel}>Købers underskrift</Text>
            </View>
          </View>
          <Text style={[s.legalText, { marginTop: 16 }]}>{PRIVACY_TEXT}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderSlutseddelPdf(data: SlutseddelData): Promise<Buffer> {
  return renderToBuffer(<SlutseddelDocument data={data} />);
}
