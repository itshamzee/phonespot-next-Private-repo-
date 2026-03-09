import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ChecklistItem } from "@/lib/supabase/types";

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
  services: { name: string; price_dkk: number }[];
  totalPrice: number;
}

export function IntakeReceiptDocument({ data }: { data: IntakeReceiptData }) {
  const shortId = `#${data.ticketId.slice(0, 8).toUpperCase()}`;
  const dateStr = new Date(data.createdAt).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const faultItems = data.checklist.filter((c) => c.status === "fejl");

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

          {/* ── Device Info ──────────────────── */}
          <View style={styles.deviceCard}>
            <Text style={styles.cardTitle}>Enhed</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Brand</Text>
                  <Text style={styles.fieldValue}>{data.deviceBrand}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Model</Text>
                  <Text style={styles.fieldValue}>{data.deviceModel}</Text>
                </View>
              </View>
              <View style={styles.col}>
                {data.serialNumber ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Serienummer</Text>
                    <Text style={styles.fieldValue}>{data.serialNumber}</Text>
                  </View>
                ) : null}
                {data.deviceColor ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Farve</Text>
                    <Text style={styles.fieldValue}>{data.deviceColor}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Condition notes (fault summary inline) */}
            {faultItems.length > 0 && (
              <View style={styles.conditionNote}>
                <Text style={styles.conditionNoteLabel}>
                  Noteret fejl ved indlevering
                </Text>
                {faultItems.map((item) => (
                  <Text key={item.label} style={styles.conditionNoteText}>
                    {"\u2022"} {item.label}
                    {item.note ? `: ${item.note}` : ""}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* ── Checklist ────────────────────── */}
          <View style={styles.checklistSection}>
            <Text style={styles.cardTitle}>Tilstand ved indlevering</Text>
            <View style={styles.checklistGrid}>
              {data.checklist.map((item) => (
                <View key={item.label} style={styles.checklistItem}>
                  <View
                    style={[
                      styles.statusDot,
                      item.status === "ok"
                        ? styles.statusOk
                        : item.status === "fejl"
                          ? styles.statusFejl
                          : styles.statusNa,
                    ]}
                  />
                  <Text style={styles.checklistLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Services Table ────────────────── */}
          <View style={styles.servicesSection}>
            <Text style={styles.cardTitle}>Reparationer</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                Ydelse
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { width: 80, textAlign: "right" },
                ]}
              >
                Pris
              </Text>
            </View>
            {data.services.map((s, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableServiceName}>{s.name}</Text>
                <Text style={styles.tableServicePrice}>
                  {s.price_dkk} DKK
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimeret total</Text>
              <Text style={styles.totalValue}>{data.totalPrice} DKK</Text>
            </View>
          </View>

          {/* ── Terms & Conditions ────────────── */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Vilkaar og betingelser</Text>
            <Text style={styles.termsText}>
              1. PhoneSpot yder 3 maaneders garanti paa alle reparationer,
              medmindre andet er aftalt.
            </Text>
            <Text style={styles.termsText}>
              2. Enheder der ikke afhentes inden 30 dage efter faerdigmelding,
              kan bortskaffes uden yderligere varsel.
            </Text>
            <Text style={styles.termsText}>
              3. PhoneSpot er ikke ansvarlig for data paa enheden. Kunden
              opfordres til at tage backup foer indlevering.
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
            CVR: 44702027 | phonespot.dk | info@phonespot.dk
          </Text>
        </View>
      </Page>
    </Document>
  );
}
