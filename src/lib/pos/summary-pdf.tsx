import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DailySummary } from "./daily-summary";
import { PAYMENT_LABELS } from "./constants";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 9, color: "#1b1b1b" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, color: "#666", marginTop: 2, marginBottom: 14 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  bold: { fontFamily: "Helvetica-Bold" },
  note: { fontSize: 7.5, color: "#777", marginTop: 14 },
});

function kr(oere: number): string {
  return (oere / 100).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateDa(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={[styles.row, styles.rowBorder]}>
      <Text style={bold ? styles.bold : undefined}>{label}</Text>
      <Text style={bold ? styles.bold : undefined}>{value}</Text>
    </View>
  );
}

export function DailySummaryPDF({ summary: s }: { summary: DailySummary }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Dagsopgørelse {dateDa(s.date)}</Text>
        <Text style={styles.sub}>PhoneSpot ApS · {s.registerName ?? "Alle kasser"}</Text>

        <Text style={styles.h2}>Salg</Text>
        <Line label={`Salg (${s.salesCount} bon)`} value={`${kr(s.grossSales)} kr`} />
        <Line label={`Returneringer (${s.creditCount} kreditnota)`} value={`-${kr(s.refunds)} kr`} />
        <Line label="Omsætning i alt inkl. moms" value={`${kr(s.netTotal)} kr`} bold />
        <Line label="Rabat givet" value={`${kr(s.discountTotal)} kr`} />
        {Object.entries(s.discountByReason).map(([reason, amount]) => (
          <Line key={reason} label={`  heraf ${reason}`} value={`${kr(amount)} kr`} />
        ))}

        <Text style={styles.h2}>Moms</Text>
        <Line label="Salg med 25 % moms (inkl. moms)" value={`${kr(s.regularGross)} kr`} />
        <Line label="Heraf udgående moms 25 %" value={`${kr(s.vatStandard)} kr`} />
        <Line label="Brugt-salg (brugtmoms)" value={`${kr(s.brugtGross)} kr`} />
        <Line label="Heraf brugtmoms (25/125 af avance)" value={`${kr(s.brugtmoms)} kr`} />

        <Text style={styles.h2}>Betalingstyper (netto)</Text>
        {s.payments.length === 0 ? <Line label="Ingen betalinger" value="-" /> : null}
        {s.payments.map((p) => (
          <Line
            key={p.type}
            label={`${PAYMENT_LABELS[p.type]}${p.refunded ? ` (modtaget ${kr(p.received)}, retur ${kr(p.refunded)})` : ""}`}
            value={`${kr(p.net)} kr`}
          />
        ))}

        <Text style={styles.h2}>Kontantkasse</Text>
        <Line label="Startbeholdning" value={`${kr(s.cash.openingFloat)} kr`} />
        <Line label="Forventet kontant (lukkede sessioner)" value={`${kr(s.cash.expectedCash)} kr`} />
        <Line label="Optalt kontant" value={`${kr(s.cash.countedCash)} kr`} />
        <Line label="Kassedifference" value={`${kr(s.cash.difference)} kr`} bold />
        <Line label="Dagens udlæg" value={`${kr(s.cash.expensesTotal)} kr`} />
        <Line label="Afleveret i bank / pengeskab" value={`${kr(s.cash.cashToBank)} kr`} />
        {s.cash.sessionsOpen > 0 ? (
          <Text style={styles.note}>
            {s.cash.sessionsOpen} kassesession er stadig åben. Dagsopgørelsen er først endelig, når alle er lukket.
          </Text>
        ) : null}

        <Text style={styles.h2}>Bonnumre</Text>
        <Line
          label="Første til sidste"
          value={s.receiptRange.first ? `${s.receiptRange.first} - ${s.receiptRange.last}` : "-"}
        />
        <Line label="Antal bon" value={String(s.receiptRange.count)} />
        {s.legacyOrderCount > 0 ? (
          <Line label="Bon uden kassenummer (ældre salg)" value={String(s.legacyOrderCount)} />
        ) : null}

        <Text style={styles.note}>
          Kvitteringer kan ikke ændres. Rettelser sker som kreditnotaer og justeringsposter. Genereret af PhoneSpot admin.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderDailySummaryPdf(summary: DailySummary): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(DailySummaryPDF, { summary }) as any);
}
