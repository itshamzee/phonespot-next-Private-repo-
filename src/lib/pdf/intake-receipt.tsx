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
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666" },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#666", width: 120 },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e5e5", marginVertical: 10 },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginTop: 4,
  },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  checklistItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingVertical: 2,
  },
  checklistStatus: { width: 40, fontFamily: "Helvetica-Bold" },
  checklistLabel: { flex: 1 },
  checklistNote: { color: "#666", marginLeft: 8 },
  terms: { marginTop: 20, fontSize: 8, color: "#999", lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999", textAlign: "center" },
  badge: { fontSize: 9, padding: "2 6", borderRadius: 4 },
  badgeFejl: { backgroundColor: "#fee2e2", color: "#dc2626" },
  badgeOk: { backgroundColor: "#dcfce7", color: "#16a34a" },
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
  const shortId = data.ticketId.slice(0, 8).toUpperCase();
  const dateStr = new Date(data.createdAt).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const faultItems = data.checklist.filter((c) => c.status === "fejl");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PhoneSpot</Text>
          <Text style={styles.subtitle}>Indleveringsbevis</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text>Sags-ID: {shortId}</Text>
            <Text>Dato: {dateStr}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kundeoplysninger</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Navn:</Text>
            <Text style={styles.value}>{data.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Telefon:</Text>
            <Text style={styles.value}>{data.customerPhone}</Text>
          </View>
          {data.customerEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.customerEmail}</Text>
            </View>
          )}
          {data.companyName && (
            <View style={styles.row}>
              <Text style={styles.label}>Firma:</Text>
              <Text style={styles.value}>
                {data.companyName}
                {data.cvr ? ` (CVR: ${data.cvr})` : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Device info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhed</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Brand:</Text>
            <Text style={styles.value}>{data.deviceBrand}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Model:</Text>
            <Text style={styles.value}>{data.deviceModel}</Text>
          </View>
          {data.serialNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Serienummer:</Text>
              <Text style={styles.value}>{data.serialNumber}</Text>
            </View>
          )}
          {data.deviceColor && (
            <View style={styles.row}>
              <Text style={styles.label}>Farve:</Text>
              <Text style={styles.value}>{data.deviceColor}</Text>
            </View>
          )}
        </View>

        {/* Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tilstand ved indlevering</Text>
          {data.checklist.map((item) => (
            <View key={item.label} style={styles.checklistItem}>
              <Text
                style={[
                  styles.checklistStatus,
                  { color: item.status === "fejl" ? "#dc2626" : item.status === "ok" ? "#16a34a" : "#999" },
                ]}
              >
                {item.status === "ok" ? "OK" : item.status === "fejl" ? "FEJL" : "N/A"}
              </Text>
              <Text style={styles.checklistLabel}>{item.label}</Text>
              {item.note ? <Text style={styles.checklistNote}>{item.note}</Text> : null}
            </View>
          ))}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reparationer</Text>
          {data.services.map((s, i) => (
            <View key={i} style={styles.serviceRow}>
              <Text>{s.name}</Text>
              <Text>{s.price_dkk} DKK</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimeret total</Text>
            <Text style={styles.totalValue}>{data.totalPrice} DKK</Text>
          </View>
        </View>

        {/* Fault summary */}
        {faultItems.length > 0 && (
          <View style={[styles.section, { backgroundColor: "#fef2f2", padding: 10, borderRadius: 4 }]}>
            <Text style={[styles.sectionTitle, { color: "#dc2626" }]}>
              Noteret fejl ved indlevering
            </Text>
            {faultItems.map((item) => (
              <Text key={item.label} style={{ color: "#dc2626", marginBottom: 2 }}>
                - {item.label}{item.note ? `: ${item.note}` : ""}
              </Text>
            ))}
          </View>
        )}

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
            Vilkaar og betingelser
          </Text>
          <Text>
            1. PhoneSpot yder 3 maaneders garanti paa alle reparationer, medmindre andet er aftalt.
          </Text>
          <Text>
            2. Enheder der ikke afhentes inden 30 dage efter faerdigmelding, kan bortskaffes uden yderligere varsel.
          </Text>
          <Text>
            3. PhoneSpot er ikke ansvarlig for data paa enheden. Kunden opfordres til at tage backup foer indlevering.
          </Text>
          <Text>
            4. Prisen er et estimat og kan aendre sig efter diagnosticering.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          PhoneSpot · Frederiksberg Centret · www.phonespot.dk · info@phonespot.dk
        </Text>
      </Page>
    </Document>
  );
}
