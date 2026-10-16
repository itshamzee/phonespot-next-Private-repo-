import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ChecklistItem } from "@/lib/supabase/types";
import { formatKrShort } from "@/lib/repairs/case-money";
import { agreedPriceNote, sumReceiptMoney, type ReceiptMoney } from "@/lib/repairs/receipt-shape";

const colors = {
  charcoal: "#2D2D2D",
  greenEco: "#22C55E",
  sand: "#F5F0EB",
  gray: "#6B7280",
  white: "#FFFFFF",
  softGrey: "#E5E7EB",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.charcoal,
    backgroundColor: colors.white,
  },

  /* ── Header ─────────────────────────────── */
  header: {
    backgroundColor: colors.charcoal,
    paddingHorizontal: 40,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {},
  brandName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    letterSpacing: 3,
  },
  headerTitle: {
    fontSize: 11,
    color: colors.softGrey,
    marginTop: 4,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerDate: {
    fontSize: 9,
    color: colors.softGrey,
  },
  headerTicketId: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    marginTop: 2,
  },

  /* ── Body wrapper ───────────────────────── */
  body: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },

  /* ── Customer Info Card ─────────────────── */
  customerCard: {
    backgroundColor: colors.sand,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  twoCol: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
  },
  fieldRow: {
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 8,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
  },

  /* ── Device Info Card ───────────────────── */
  deviceCard: {
    borderWidth: 1,
    borderColor: colors.softGrey,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  conditionNote: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 4,
  },
  conditionNoteLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#DC2626",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  conditionNoteText: {
    fontSize: 9,
    color: "#DC2626",
  },

  /* ── Checklist ──────────────────────────── */
  checklistSection: {
    marginBottom: 16,
  },
  checklistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  checklistItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOk: {
    backgroundColor: colors.greenEco,
  },
  statusFejl: {
    backgroundColor: "#EF4444",
  },
  statusNa: {
    backgroundColor: "#D1D5DB",
  },
  checklistStatusText: {
    fontSize: 8,
    color: colors.gray,
    marginLeft: 4,
  },
  checklistLabel: {
    fontSize: 9,
    color: colors.charcoal,
  },
  checklistNote: {
    fontSize: 8,
    color: colors.gray,
    fontStyle: "italic",
    marginLeft: 14,
  },

  /* ── Services Table ─────────────────────── */
  servicesSection: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.charcoal,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.softGrey,
  },
  tableServiceName: {
    flex: 1,
    fontSize: 10,
  },
  tableServicePrice: {
    width: 80,
    textAlign: "right",
    fontSize: 10,
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.charcoal,
    backgroundColor: "#F9FAFB",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  totalLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
  },
  tableQty: {
    width: 34,
    textAlign: "right",
    fontSize: 10,
  },
  tableNote: {
    fontSize: 7.5,
    color: colors.gray,
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 10,
    color: colors.gray,
  },
  summaryValue: {
    width: 80,
    textAlign: "right",
    fontSize: 10,
    color: colors.gray,
  },
  totalValue: {
    width: 80,
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.greenEco,
  },

  /* ── Terms ──────────────────────────────── */
  termsSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 7.5,
    color: colors.gray,
    lineHeight: 1.5,
    marginBottom: 2,
  },

  /* ── Footer ─────────────────────────────── */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: colors.gray,
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
  },
});

interface IntakeReceiptData {
  ticketId: string;
  /** Menneskelæsbart sagsnummer (PS-2026-0001). Falder tilbage til kort uuid. */
  ticketNumber?: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerType: string;
  companyName?: string;
  cvr?: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  deviceColor?: string;
  checklist: ChecklistItem[];
  /** Linjer og beløb fra sagen (lib/repairs/receipt.ts). */
  money: ReceiptMoney;
  /**
   * Indlevering med flere enheder: ét bevis med alle enheder (én sag hver). Med mindst to
   * enheder bruges listen; felterne ovenfor beskriver så den første. Ellers det normale bevis.
   */
  devices?: IntakeReceiptDevice[];
}

export interface IntakeReceiptDevice {
  ticketId: string;
  ticketNumber?: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  deviceColor?: string;
  checklist: ChecklistItem[];
  money: ReceiptMoney;
}

function checklistStatusText(status: string): string {
  switch (status) {
    case "ok":
      return "OK";
    case "fejl":
      return "Fejl";
    case "ikke_relevant":
      return "Ikke relevant";
    default:
      return "Ikke vurderet";
  }
}

type DeviceLike = {
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  deviceColor?: string;
  checklist: ChecklistItem[];
};

function DeviceCard({ dev }: { dev: DeviceLike }) {
  const faultItems = dev.checklist.filter((c) => c.status === "fejl");
  return (
    <View style={styles.deviceCard}>
      <Text style={styles.cardTitle}>Enhed</Text>
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Brand</Text>
            <Text style={styles.fieldValue}>{dev.deviceBrand}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Model</Text>
            <Text style={styles.fieldValue}>{dev.deviceModel}</Text>
          </View>
        </View>
        <View style={styles.col}>
          {dev.serialNumber ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Serienummer</Text>
              <Text style={styles.fieldValue}>{dev.serialNumber}</Text>
            </View>
          ) : null}
          {dev.deviceColor ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Farve</Text>
              <Text style={styles.fieldValue}>{dev.deviceColor}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {faultItems.length > 0 && (
        <View style={styles.conditionNote}>
          <Text style={styles.conditionNoteLabel}>Noteret fejl ved indlevering</Text>
          {faultItems.map((item) => (
            <Text key={item.label} style={styles.conditionNoteText}>
              {"•"} {item.label}
              {item.note ? `: ${item.note}` : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ChecklistBlock({ checklist }: { checklist: ChecklistItem[] }) {
  return (
    <View style={styles.checklistSection}>
      <Text style={styles.cardTitle}>Tilstand ved indlevering</Text>
      <View style={styles.checklistGrid}>
        {checklist.map((item) => (
          <View key={item.label} style={styles.checklistItem}>
            <View
              style={[
                styles.statusDot,
                item.status === "ok" ? styles.statusOk : item.status === "fejl" ? styles.statusFejl : styles.statusNa,
              ]}
            />
            <Text style={styles.checklistLabel}>{item.label}</Text>
            <Text style={styles.checklistStatusText}>{checklistStatusText(item.status)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong ? { fontFamily: "Helvetica-Bold", color: colors.charcoal } : {}]}>{label}</Text>
      <Text style={[styles.summaryValue, strong ? { fontFamily: "Helvetica-Bold", color: colors.charcoal } : {}]}>{value}</Text>
    </View>
  );
}

/** Rabat, depositum og rest under totalen. Rest vises kun når depositum kendes. */
function SummaryRows({ m }: { m: Omit<ReceiptMoney, "lines"> }) {
  return (
    <>
      {m.discount_oere > 0 ? <SummaryRow label="Rabat" value={`-${formatKrShort(m.discount_oere)}`} /> : null}
      {m.deposits_ok && m.deposits_oere > 0 ? <SummaryRow label="Depositum betalt" value={`-${formatKrShort(m.deposits_oere)}`} /> : null}
      {m.deposits_ok ? <SummaryRow label="Rest at betale" value={formatKrShort(m.rest_oere)} strong /> : null}
    </>
  );
}

function ServicesTable({ money, label }: { money: ReceiptMoney; label: string }) {
  const showSubtotal = money.discount_oere > 0;
  return (
    <View style={styles.servicesSection}>
      <Text style={styles.cardTitle}>Reparationer</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Ydelse</Text>
        <Text style={[styles.tableHeaderText, { width: 34, textAlign: "right" }]}>Antal</Text>
        <Text style={[styles.tableHeaderText, { width: 80, textAlign: "right" }]}>Pris</Text>
      </View>
      {money.lines.map((l, i) => {
        const note = l.sold ? "Betalt i kassen" : agreedPriceNote(l);
        return (
          <View key={i} style={styles.tableRow} wrap={false}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableServiceName}>{l.name}</Text>
              {note ? <Text style={styles.tableNote}>{note}</Text> : null}
            </View>
            <Text style={styles.tableQty}>{l.qty}</Text>
            <Text style={styles.tableServicePrice}>{formatKrShort(l.total_oere)}</Text>
          </View>
        );
      })}
      {showSubtotal ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tableServiceName, { color: colors.gray }]}>Subtotal</Text>
          <Text style={styles.tableServicePrice}>{formatKrShort(money.subtotal_oere)}</Text>
        </View>
      ) : null}
      {showSubtotal ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tableServiceName, { color: colors.gray }]}>Rabat</Text>
          <Text style={styles.tableServicePrice}>-{formatKrShort(money.discount_oere)}</Text>
        </View>
      ) : null}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{label}</Text>
        <Text style={styles.totalValue}>{formatKrShort(money.total_oere)}</Text>
      </View>
      {money.deposits_ok && money.deposits_oere > 0 ? <SummaryRow label="Depositum betalt" value={`-${formatKrShort(money.deposits_oere)}`} /> : null}
      {money.deposits_ok ? <SummaryRow label="Rest at betale" value={formatKrShort(money.rest_oere)} strong /> : null}
    </View>
  );
}

export function IntakeReceiptDocument({ data }: { data: IntakeReceiptData }) {
  const group = data.devices && data.devices.length > 1 ? data.devices : null;
  const shortId = group
    ? group.map((d) => d.ticketNumber || `#${d.ticketId.slice(0, 8).toUpperCase()}`).join(" · ")
    : data.ticketNumber || `#${data.ticketId.slice(0, 8).toUpperCase()}`;
  const groupTotals = sumReceiptMoney(group ? group.map((d) => d.money) : [data.money]);
  const dateStr = new Date(data.createdAt).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ──────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>PHONESPOT</Text>
            <Text style={styles.headerTitle}>Indleveringsbevis</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>{dateStr}</Text>
            <Text style={styles.headerTicketId}>{shortId}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Customer Info ────────────────── */}
          <View style={styles.customerCard}>
            <Text style={styles.cardTitle}>Kundeoplysninger</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Navn</Text>
                  <Text style={styles.fieldValue}>{data.customerName}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Telefon</Text>
                  <Text style={styles.fieldValue}>{data.customerPhone}</Text>
                </View>
              </View>
              <View style={styles.col}>
                {data.customerEmail ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <Text style={styles.fieldValue}>{data.customerEmail}</Text>
                  </View>
                ) : null}
                {data.companyName ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>
                      Firma{data.cvr ? ` / CVR` : ""}
                    </Text>
                    <Text style={styles.fieldValue}>
                      {data.companyName}
                      {data.cvr ? ` (${data.cvr})` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {group ? (
            <>
              <Text style={styles.cardTitle}>{group.length} enheder indleveret</Text>
              {group.map((dev, i) => (
                <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                  <Text style={[styles.cardTitle, { marginBottom: 4 }]}>
                    Enhed {i + 1}
                    {dev.ticketNumber ? ` · ${dev.ticketNumber}` : ""}
                  </Text>
                  <DeviceCard dev={dev} />
                  <ChecklistBlock checklist={dev.checklist} />
                  <ServicesTable money={dev.money} label="Delsum" />
                </View>
              ))}
              <View style={{ marginBottom: 16 }}>
                <View style={[styles.totalRow, { borderRadius: 4 }]}>
                  <Text style={styles.totalLabel}>Estimeret total, alle enheder</Text>
                  <Text style={styles.totalValue}>{formatKrShort(groupTotals.total_oere)}</Text>
                </View>
                <SummaryRows m={groupTotals} />
              </View>
            </>
          ) : (
            <>
              <DeviceCard dev={data} />
              <ChecklistBlock checklist={data.checklist} />
              <ServicesTable money={data.money} label="Estimeret total" />
            </>
          )}

          {/* ── Terms & Conditions ────────────── */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Vilkår og betingelser</Text>
            <Text style={styles.termsText}>
              1. PhoneSpot yder 3 måneders garanti på alle reparationer,
              medmindre andet er aftalt.
            </Text>
            <Text style={styles.termsText}>
              2. Enheder der ikke afhentes inden 30 dage efter færdigmelding,
              kan bortskaffes uden yderligere varsel.
            </Text>
            <Text style={styles.termsText}>
              3. PhoneSpot er ikke ansvarlig for data på enheden. Kunden
              opfordres til at tage backup før indlevering.
            </Text>
            <Text style={styles.termsText}>
              4. Prisen er et estimat og kan aendre sig efter diagnosticering.
            </Text>
          </View>
        </View>

        {/* ── Footer ──────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>PHONESPOT</Text>
          <Text style={styles.footerText}>
            CVR: 38688766 | phonespot.dk | info@phonespot.dk
          </Text>
        </View>
      </Page>
    </Document>
  );
}
