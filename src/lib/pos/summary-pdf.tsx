import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DailySummary } from "./daily-summary";
import { PAYMENT_LABELS, POS_TIME_ZONE, isPaymentType } from "./constants";
import { THREE_FOR_TWO_LABEL } from "@/lib/lagersalg/three-for-two";

/**
 * Dagsopgørelsen som bilag til bogføringen. Rækkefølgen følger det, bogholderen
 * skal bruge: hvem og hvornår, dagens tal, momsfordeling, afstemning af
 * betalinger og til sidst hver bon. Afsnit uden beløb udelades.
 */

const INK = "#1D1D1F";
const MUTED = "#6B706C";
const RULE = "#DADFDB";
const GREEN = "#1A3D2E";
const TINT = "#F3F5F3";
const WARN = "#A1260D";

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 9, color: INK },
  bar: { height: 3, backgroundColor: GREEN, marginBottom: 18 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.4 },
  date: { fontSize: 11, marginTop: 4, color: INK },
  company: { textAlign: "right", fontSize: 9, lineHeight: 1.45 },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  muted: { color: MUTED },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 0.75,
    borderTopColor: RULE,
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
  },
  metaItem: { marginRight: 26 },
  metaLabel: { fontSize: 7.5, color: MUTED, marginBottom: 2 },
  metaValue: { fontSize: 9.5 },
  keys: { flexDirection: "row", marginTop: 18 },
  key: { flex: 1, backgroundColor: TINT, paddingVertical: 12, paddingHorizontal: 12, marginRight: 8, borderRadius: 4 },
  keyLast: { marginRight: 0 },
  keyLabel: { fontSize: 8, color: MUTED, marginBottom: 5 },
  keyValue: { fontSize: 17, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 22, marginBottom: 6 },
  tr: { flexDirection: "row", paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: RULE },
  th: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 0.75, borderBottomColor: INK },
  thText: { fontSize: 7.5, color: MUTED },
  total: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.75, borderBottomColor: INK },
  bold: { fontFamily: "Helvetica-Bold" },
  num: { textAlign: "right" },
  status: { marginTop: 8, fontSize: 9 },
  warn: { color: WARN, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 7.5, color: MUTED },
  footer: {
    position: "absolute",
    left: 44,
    right: 44,
    bottom: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 6,
  },
});

function kr(oere: number): string {
  const v = (Math.abs(oere) / 100).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return oere < 0 ? `-${v}` : v;
}

function longDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const text = new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, day)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function clock(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: POS_TIME_ZONE }).format(
    new Date(iso),
  );
}

function stamp(d: Date): string {
  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: POS_TIME_ZONE,
  }).format(d);
}

function payLabel(type: string): string {
  return isPaymentType(type) ? PAYMENT_LABELS[type] : type;
}

type Col = { text: string; flex: number; right?: boolean; bold?: boolean; color?: string; size?: number };

function Row({ cols, kind = "tr" }: { cols: Col[]; kind?: "tr" | "th" | "total" }) {
  return (
    <View style={styles[kind]} wrap={false}>
      {cols.map((c, i) => (
        <Text
          key={i}
          style={[
            { flex: c.flex },
            kind === "th" ? styles.thText : {},
            c.right ? styles.num : {},
            c.bold || kind === "total" ? styles.bold : {},
            c.color ? { color: c.color } : {},
            c.size ? { fontSize: c.size } : {},
          ]}
        >
          {c.text}
        </Text>
      ))}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export function DailySummaryPDF({ summary: s, printedAt }: { summary: DailySummary; printedAt?: Date }) {
  const closed = s.sessions.filter((x) => x.locked);
  const opened = closed.length ? closed.map((x) => x.openedAt).sort()[0] : null;
  const closedAt = closed.length ? closed.map((x) => x.closedAt ?? "").sort().slice(-1)[0] : null;
  const names = (pick: (x: (typeof closed)[number]) => string | null | undefined) =>
    [...new Set(closed.map(pick).filter((n): n is string => !!n))].join(", ");
  const openedBy = names((x) => x.openedByName);
  const closedBy = names((x) => x.closedByName);

  const cashPay = s.payments.find((p) => p.type === "kontant");
  const hasCash =
    !!cashPay || s.cash.openingFloat !== 0 || s.cash.countedCash !== 0 || s.cash.expectedCash !== 0 || s.cash.expensesTotal !== 0;
  const otherPays = s.payments.filter((p) => p.type !== "kontant" && p.type !== "kort_terminal");
  const cardPay = s.payments.find((p) => p.type === "kort_terminal");
  const cardRegistered = cardPay?.net ?? 0;
  const cardDiff = s.card ? s.card.counted - cardRegistered : 0;
  const cashDiff = s.cash.difference;
  const reconciled = s.cash.sessionsOpen === 0 && closed.length > 0;
  const allEven = reconciled && cardDiff === 0 && cashDiff === 0 && (!cardPay || !!s.card);
  const hasDeposits = s.deposits.received !== 0 || s.deposits.applied !== 0;
  const hasBrugt = s.brugtGross !== 0 || s.brugtmoms !== 0;
  const paySum = s.payments.reduce((sum, p) => sum + p.net, 0);

  return (
    <Document title={`Dagsopgørelse ${s.date}`} author={s.company?.name ?? "PhoneSpot"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.bar} fixed />

        <View style={styles.head}>
          <View>
            <Text style={styles.title}>Dagsopgørelse</Text>
            <Text style={styles.date}>{longDate(s.date)}</Text>
          </View>
          <View style={styles.company}>
            <Text style={styles.companyName}>{s.company?.name ?? "Fixon ApS"}</Text>
            {s.company?.cvr ? <Text>CVR-nr. {s.company.cvr}</Text> : null}
            {s.locationName ? <Text>PhoneSpot {s.locationName}</Text> : null}
            {s.locationAddress ? <Text style={styles.muted}>{s.locationAddress}</Text> : null}
          </View>
        </View>

        <View style={styles.meta}>
          <Meta label="Kasse" value={s.registerName ?? "Alle kasser"} />
          <Meta label="Åbnet" value={opened ? `kl. ${clock(opened)}${openedBy ? ` af ${openedBy}` : ""}` : "-"} />
          <Meta
            label="Lukket"
            value={
              s.cash.sessionsOpen > 0
                ? "Ikke lukket endnu"
                : closedAt
                  ? `kl. ${clock(closedAt)}${closedBy ? ` af ${closedBy}` : ""}`
                  : "-"
            }
          />
          <Meta
            label="Bonnumre"
            value={
              s.receiptRange.first
                ? `${s.receiptRange.first} til ${s.receiptRange.last} (${s.receiptRange.count} stk.)`
                : "Ingen bonner"
            }
          />
        </View>

        {s.cash.sessionsOpen > 0 ? (
          <Text style={[styles.status, styles.warn]}>
            Foreløbig opgørelse: {s.cash.sessionsOpen} kassesession er stadig åben. Tallene er først endelige, når kassen er lukket.
          </Text>
        ) : null}

        <View style={styles.keys}>
          <View style={styles.key}>
            <Text style={styles.keyLabel}>Omsætning inkl. moms</Text>
            <Text style={styles.keyValue}>{kr(s.netTotal)} kr.</Text>
          </View>
          <View style={styles.key}>
            <Text style={styles.keyLabel}>Heraf moms</Text>
            <Text style={styles.keyValue}>{kr(s.vatStandard + s.brugtmoms)} kr.</Text>
          </View>
          <View style={[styles.key, styles.keyLast]}>
            <Text style={styles.keyLabel}>Omsætning ekskl. moms</Text>
            <Text style={styles.keyValue}>{kr(s.netExVat)} kr.</Text>
          </View>
        </View>

        <Text style={styles.h2}>Til bogføring</Text>
        <Row
          kind="th"
          cols={[
            { text: "Momstype", flex: 4 },
            { text: "Inkl. moms", flex: 2, right: true },
            { text: "Moms", flex: 2, right: true },
            { text: "Ekskl. moms", flex: 2, right: true },
          ]}
        />
        <Row
          cols={[
            { text: "Salg med 25 % moms", flex: 4 },
            { text: kr(s.regularGross), flex: 2, right: true },
            { text: kr(s.vatStandard), flex: 2, right: true },
            { text: kr(s.regularGross - s.vatStandard), flex: 2, right: true },
          ]}
        />
        {hasBrugt ? (
          <Row
            cols={[
              { text: "Brugte varer (brugtmoms, 25 % af avancen)", flex: 4 },
              { text: kr(s.brugtGross), flex: 2, right: true },
              { text: kr(s.brugtmoms), flex: 2, right: true },
              { text: kr(s.brugtGross - s.brugtmoms), flex: 2, right: true },
            ]}
          />
        ) : null}
        <Row
          kind="total"
          cols={[
            { text: "I alt", flex: 4 },
            { text: kr(s.netTotal), flex: 2, right: true },
            { text: kr(s.vatStandard + s.brugtmoms), flex: 2, right: true },
            { text: kr(s.netExVat), flex: 2, right: true },
          ]}
        />
        {hasDeposits ? (
          <Text style={[styles.small, { marginTop: 5 }]}>
            Heri depositum modtaget {kr(s.deposits.received)} kr. (moms {kr(s.deposits.receivedVat)} kr.) og depositum
            modregnet {kr(s.deposits.applied)} kr. (moms {kr(s.deposits.appliedVat)} kr.).
          </Text>
        ) : null}

        <Text style={styles.h2}>Salg fordelt på type</Text>
        <Row kind="th" cols={[{ text: "Type", flex: 8 }, { text: "Inkl. moms", flex: 2, right: true }]} />
        {s.byKind.length === 0 ? <Row cols={[{ text: "Ingen salg", flex: 8 }, { text: "-", flex: 2, right: true }]} /> : null}
        {s.byKind.map((k) => (
          <Row key={k.kind} cols={[{ text: k.label, flex: 8 }, { text: kr(k.gross), flex: 2, right: true }]} />
        ))}
        <Row kind="total" cols={[{ text: `I alt (${s.salesCount} salg, ${s.creditCount} kreditnotaer)`, flex: 8 }, { text: kr(s.netTotal), flex: 2, right: true }]} />
        {s.refunds !== 0 || s.discountTotal !== 0 || s.bundleTotal > 0 ? (
          <Text style={[styles.small, { marginTop: 5 }]}>
            {[
              s.refunds !== 0 ? `Returneret på kreditnota: ${kr(s.refunds)} kr.` : "",
              s.discountTotal !== 0
                ? `Rabat givet: ${kr(s.discountTotal)} kr. (${Object.entries(s.discountByReason)
                    .map(([reason, amount]) => `${reason} ${kr(amount)}`)
                    .join(", ")})`
                : "",
              s.bundleTotal > 0 ? `${THREE_FOR_TWO_LABEL}: ${kr(s.bundleTotal)} kr.` : "",
            ]
              .filter(Boolean)
              .join("  ")}
          </Text>
        ) : null}

        <Text style={styles.h2}>Betalinger og afstemning</Text>
        <Row
          kind="th"
          cols={[
            { text: "Betalingstype", flex: 4 },
            { text: "Registreret i kassen", flex: 2, right: true },
            { text: "Optalt / terminal", flex: 2, right: true },
            { text: "Difference", flex: 2, right: true },
          ]}
        />
        {s.payments.length === 0 ? (
          <Row cols={[{ text: "Ingen betalinger", flex: 4 }, { text: "-", flex: 6, right: true }]} />
        ) : null}
        {cardPay ? (
          <Row
            cols={[
              { text: PAYMENT_LABELS.kort_terminal, flex: 4 },
              { text: kr(cardRegistered), flex: 2, right: true },
              { text: s.card ? kr(s.card.counted) : "Ikke afstemt", flex: 2, right: true },
              {
                text: s.card ? kr(cardDiff) : "-",
                flex: 2,
                right: true,
                bold: cardDiff !== 0,
                color: cardDiff !== 0 ? WARN : undefined,
              },
            ]}
          />
        ) : null}
        {hasCash ? (
          <Row
            cols={[
              { text: "Kontant (forventet beholdning mod optalt)", flex: 4 },
              { text: kr(s.cash.expectedCash), flex: 2, right: true },
              { text: kr(s.cash.countedCash), flex: 2, right: true },
              { text: kr(cashDiff), flex: 2, right: true, bold: cashDiff !== 0, color: cashDiff !== 0 ? WARN : undefined },
            ]}
          />
        ) : null}
        {otherPays.map((p) => (
          <Row
            key={p.type}
            cols={[
              { text: PAYMENT_LABELS[p.type], flex: 4 },
              { text: kr(p.net), flex: 2, right: true },
              { text: "-", flex: 2, right: true },
              { text: "-", flex: 2, right: true },
            ]}
          />
        ))}
        <Row
          kind="total"
          cols={[
            { text: "Betalinger i alt", flex: 4 },
            { text: kr(paySum), flex: 2, right: true },
            { text: "", flex: 4 },
          ]}
        />
        {hasCash ? (
          <Text style={[styles.small, { marginTop: 5 }]}>
            Kontant: startbeholdning {kr(s.cash.openingFloat)} kr., kontantsalg netto {kr(cashPay?.net ?? 0)} kr., udlæg{" "}
            {kr(s.cash.expensesTotal)} kr., afleveret i bank eller pengeskab {kr(s.cash.cashToBank)} kr.
          </Text>
        ) : (
          <Text style={[styles.small, { marginTop: 5 }]}>Ingen kontanter i kassen denne dag.</Text>
        )}
        {s.card?.notes.length ? (
          <Text style={[styles.small, { marginTop: 3 }]}>Bemærkning til kort: {s.card.notes.join(" / ")}</Text>
        ) : null}
        {reconciled ? (
          <Text style={[styles.status, allEven ? styles.bold : styles.warn]}>
            {allEven
              ? "Afstemt uden difference."
              : cardPay && !s.card
                ? "Kortsalget er ikke afstemt mod terminalen."
                : "Afstemt med difference. Se beløbene ovenfor."}
          </Text>
        ) : null}

        <Text style={styles.h2}>Bonner</Text>
        <Row
          kind="th"
          cols={[
            { text: "Bon", flex: 2 },
            { text: "Kl.", flex: 1 },
            { text: "Indhold", flex: 4 },
            { text: "Betaling og reference", flex: 5 },
            { text: "Beløb", flex: 2, right: true },
          ]}
        />
        {s.receipts.length === 0 ? <Row cols={[{ text: "Ingen bonner", flex: 14 }]} /> : null}
        {s.receipts.map((r, i) => (
          <Row
            key={`${r.number}-${i}`}
            cols={[
              { text: r.number, flex: 2 },
              { text: clock(r.confirmedAt), flex: 1 },
              { text: r.type === "credit_note" ? `Kreditnota: ${r.what}` : r.what, flex: 4, size: 8.5 },
              {
                text: r.payments
                  .map((p) => `${payLabel(p.type)}${r.payments.length > 1 ? ` ${kr(p.amount)}` : ""}${p.reference ? `\n${p.reference}` : ""}`)
                  .join("\n"),
                flex: 5,
                size: 7.5,
                color: MUTED,
              },
              { text: kr(r.total), flex: 2, right: true },
            ]}
          />
        ))}
        <Row
          kind="total"
          cols={[
            { text: `${s.receipts.length} bonner`, flex: 12 },
            { text: kr(s.receipts.reduce((sum, r) => sum + r.total, 0)), flex: 2, right: true },
          ]}
        />
        {s.legacyOrderCount > 0 ? (
          <Text style={[styles.small, { marginTop: 5 }]}>{s.legacyOrderCount} bon uden kassenummer (ældre salg).</Text>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.small}>
            Bonner er låst og kan ikke ændres. Rettelser sker som kreditnotaer. Udskrevet {stamp(printedAt ?? new Date())} fra
            PhoneSpot kasse.
          </Text>
          <Text style={styles.small} render={({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderDailySummaryPdf(summary: DailySummary): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(DailySummaryPDF, { summary }) as any);
}
