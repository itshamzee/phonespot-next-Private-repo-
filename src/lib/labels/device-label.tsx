import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const MM_TO_PT = 2.835;
const LABEL_WIDTH = 62 * MM_TO_PT;
const LABEL_HEIGHT = 29 * MM_TO_PT;

const styles = StyleSheet.create({
  page: {
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    padding: 6,
    fontFamily: "Helvetica",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  model: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    maxWidth: "75%",
  },
  gradeBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  specs: {
    fontSize: 6,
    color: "#666",
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  price: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  priceLabel: {
    fontSize: 5,
    color: "#999",
  },
  barcode: {
    fontSize: 6,
    fontFamily: "Courier",
    color: "#666",
  },
  brand: {
    fontSize: 5,
    color: "#999",
  },
});

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a",
  B: "#d97706",
  C: "#dc2626",
};

type DeviceLabelProps = {
  model: string;
  grade: string;
  storage: string | null;
  color: string | null;
  price: number; // øre — always inkl. moms
  barcode: string;
};

function formatPrice(øre: number): string {
  return (øre / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ",-";
}

export function DeviceLabelPDF({ labels }: { labels: DeviceLabelProps[] }) {
  return (
    <Document>
      {labels.map((label, i) => (
        <Page key={i} size={{ width: LABEL_WIDTH, height: LABEL_HEIGHT }} style={styles.page}>
          <View style={styles.container}>
            <View>
              <View style={styles.topRow}>
                <Text style={styles.model}>{label.model}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[label.grade] || "#666" }]}>
                  <Text style={{ color: "#fff", fontSize: 7 }}>{label.grade}</Text>
                </View>
              </View>
              <Text style={styles.specs}>
                {[label.storage, label.color].filter(Boolean).join(" · ")}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.price}>{formatPrice(label.price)}</Text>
                <Text style={styles.priceLabel}>inkl. moms</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.barcode}>{label.barcode}</Text>
                <Text style={styles.brand}>PhoneSpot</Text>
              </View>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
