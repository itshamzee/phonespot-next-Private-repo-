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

  /* ── Two-column cards row ───────────────── */
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  /* ── Customer Info Card ─────────────────── */
  customerCard: {
    flex: 1,
    backgroundColor: colors.sand,
    borderRadius: 6,
    padding: 16,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
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
    flex: 1,
    borderWidth: 1,
    borderColor: colors.softGrey,
    borderRadius: 6,
    padding: 16,
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

  /* ── Repairs Table ──────────────────────── */
  repairsSection: {
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
    alignItems: "center",
  },
  repairCheckbox: {
    width: 10,
    height: 10,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    borderRadius: 2,
    marginRight: 8,
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

  /* ── Internal Notes ─────────────────────── */
  notesSection: {
    marginBottom: 16,
  },
  notesBox: {
    borderWidth: 1,
    borderColor: colors.softGrey,
    borderRadius: 6,
    padding: 12,
    minHeight: 50,
    backgroundColor: "#F9FAFB",
  },
  notesText: {
    fontSize: 9,
    color: colors.charcoal,
    lineHeight: 1.5,
  },

  /* ── Technician Notes ───────────────────── */
  techNotesSection: {
    marginBottom: 20,
  },
  techNotesBox: {
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    borderRadius: 6,
    padding: 14,
    minHeight: 120,
  },
  techNotesLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.softGrey,
    height: 22,
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

interface WorkshopReportData {
  ticketId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  deviceColor?: string;
  checklist: ChecklistItem[];
  services: { name: string; price_dkk: number }[];
  internalNotes: string;
}

export function WorkshopReportDocument({ data }: { data: WorkshopReportData }) {
  const shortId = `#${data.ticketId.slice(0, 8).toUpperCase()}`;
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
            <Text style={styles.headerTitle}>Vaerkstedsrapport</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>{dateStr}</Text>
            <Text style={styles.headerTicketId}>{shortId}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Customer & Device Info (side-by-side) ── */}
          <View style={styles.cardsRow}>
            <View style={styles.customerCard}>
              <Text style={styles.cardTitle}>Kundeoplysninger</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Navn</Text>
                <Text style={styles.fieldValue}>{data.customerName}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Telefon</Text>
                <Text style={styles.fieldValue}>{data.customerPhone}</Text>
              </View>
            </View>

            <View style={styles.deviceCard}>
              <Text style={styles.cardTitle}>Enhed</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Brand</Text>
                <Text style={styles.fieldValue}>{data.deviceBrand}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Model</Text>
                <Text style={styles.fieldValue}>{data.deviceModel}</Text>
              </View>
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

          {/* ── Checklist ────────────────────────── */}
          <View style={styles.checklistSection}>
            <Text style={styles.cardTitle}>Tilstandstjekliste</Text>
            <View style={styles.checklistGrid}>
              {data.checklist.map((item) => (
                <View key={item.label}>
                  <View style={styles.checklistItem}>
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
                  {item.note ? (
                    <Text style={styles.checklistNote}>{item.note}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          {/* ── Repairs Performed ─────────────────── */}
          <View style={styles.repairsSection}>
            <Text style={styles.cardTitle}>Udfoerte reparationer</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 18 }]} />
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
                <View style={styles.repairCheckbox} />
                <Text style={styles.tableServiceName}>{s.name}</Text>
                <Text style={styles.tableServicePrice}>
                  {s.price_dkk} DKK
                </Text>
              </View>
            ))}
          </View>

          {/* ── Internal Notes ────────────────────── */}
          {data.internalNotes ? (
            <View style={styles.notesSection}>
              <Text style={styles.cardTitle}>Interne noter</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{data.internalNotes}</Text>
              </View>
            </View>
          ) : null}

          {/* ── Technician Notes (blank lines) ────── */}
          <View style={styles.techNotesSection}>
            <Text style={styles.cardTitle}>Tekniker noter</Text>
            <View style={styles.techNotesBox}>
              {[1, 2, 3, 4, 5].map((n) => (
                <View key={n} style={styles.techNotesLine} />
              ))}
            </View>
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
