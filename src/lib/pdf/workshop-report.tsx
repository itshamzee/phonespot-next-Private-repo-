import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ChecklistItem } from "@/lib/supabase/types";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  bigId: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  dateCenter: { textAlign: "center", color: "#666", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    backgroundColor: "#f3f4f6",
    padding: "4 8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: { flexDirection: "row", marginBottom: 3, paddingHorizontal: 8 },
  infoLabel: { width: 100, color: "#666" },
  infoValue: { flex: 1, fontFamily: "Helvetica-Bold" },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: "#333",
    marginRight: 8,
    borderRadius: 2,
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: "#16a34a",
    backgroundColor: "#dcfce7",
    marginRight: 8,
    borderRadius: 2,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  notesBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
    minHeight: 60,
    marginHorizontal: 8,
  },
  techNotesSection: {
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: "#333",
    borderRadius: 4,
    padding: 12,
    minHeight: 120,
  },
  techNotesTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  techNotesLines: { borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", height: 20 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  faultBadge: {
    fontSize: 8,
    color: "#dc2626",
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#fee2e2",
    padding: "1 4",
    borderRadius: 2,
    marginLeft: 4,
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
  const shortId = data.ticketId.slice(0, 8).toUpperCase();
  const dateStr = new Date(data.createdAt).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Large ticket ID */}
        <Text style={styles.bigId}>SAG: {shortId}</Text>
        <Text style={styles.dateCenter}>{dateStr}</Text>

        {/* Customer + device info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kunde & Enhed</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kunde:</Text>
            <Text style={styles.infoValue}>{data.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefon:</Text>
            <Text style={styles.infoValue}>{data.customerPhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Enhed:</Text>
            <Text style={styles.infoValue}>
              {data.deviceBrand} {data.deviceModel}
            </Text>
          </View>
          {data.serialNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Serienr:</Text>
              <Text style={styles.infoValue}>{data.serialNumber}</Text>
            </View>
          )}
          {data.deviceColor && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Farve:</Text>
              <Text style={styles.infoValue}>{data.deviceColor}</Text>
            </View>
          )}
        </View>

        {/* Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tilstandstjekliste</Text>
          {data.checklist.map((item) => (
            <View key={item.label} style={styles.checklistItem}>
              <View
                style={
                  item.status === "fejl"
                    ? [styles.checkbox, { borderColor: "#dc2626", backgroundColor: "#fee2e2" }]
                    : item.status === "ok"
                      ? styles.checkboxChecked
                      : [styles.checkbox, { borderColor: "#999" }]
                }
              />
              <Text style={{ flex: 1 }}>
                {item.label}
                {item.note ? ` — ${item.note}` : ""}
              </Text>
              {item.status === "fejl" && <Text style={styles.faultBadge}>FEJL</Text>}
            </View>
          ))}
        </View>

        {/* Repairs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reparationer</Text>
          {data.services.map((s, i) => (
            <View key={i} style={styles.serviceItem}>
              <View style={styles.checkbox} />
              <Text style={{ flex: 1 }}>{s.name}</Text>
              <Text style={{ color: "#666" }}>{s.price_dkk} DKK</Text>
            </View>
          ))}
        </View>

        {/* Internal notes */}
        {data.internalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interne noter</Text>
            <View style={styles.notesBox}>
              <Text>{data.internalNotes}</Text>
            </View>
          </View>
        )}

        {/* Technician notes (empty for handwriting) */}
        <View style={styles.techNotesSection}>
          <Text style={styles.techNotesTitle}>Tekniker noter:</Text>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={styles.techNotesLines} />
          ))}
        </View>

        <Text style={styles.footer}>
          PhoneSpot Vaerkstedsrapport · {shortId} · {dateStr}
        </Text>
      </Page>
    </Document>
  );
}
