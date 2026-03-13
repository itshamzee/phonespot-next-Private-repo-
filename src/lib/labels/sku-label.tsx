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
  title: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  category: {
    fontSize: 6,
    color: "#666",
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceContainer: {},
  price: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  salePrice: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
  },
  originalPrice: {
    fontSize: 8,
    color: "#999",
    textDecoration: "line-through",
  },
  priceLabel: {
    fontSize: 5,
    color: "#999",
  },
  ean: {
    fontSize: 6,
    fontFamily: "Courier",
    color: "#666",
  },
  brand: {
    fontSize: 5,
    color: "#999",
  },
});

type SkuLabelProps = {
  title: string;
  category: string | null;
  price: number; // øre — selling_price (inkl. moms)
  salePrice: number | null; // øre — sale_price if on sale
  ean: string | null;
};

function formatPrice(øre: number): string {
  return (øre / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ",-";
}

export function SkuLabelPDF({ labels }: { labels: SkuLabelProps[] }) {
  return (
    <Document>
      {labels.map((label, i) => {
        const isOnSale = label.salePrice !== null && label.salePrice < label.price;
        const displayPrice = isOnSale ? label.salePrice! : label.price;

        return (
          <Page key={i} size={{ width: LABEL_WIDTH, height: LABEL_HEIGHT }} style={styles.page}>
            <View style={styles.container}>
              <View>
                <Text style={styles.title}>{label.title}</Text>
                {label.category && (
                  <Text style={styles.category}>{label.category}</Text>
                )}
              </View>

              <View style={styles.bottomRow}>
                <View style={styles.priceContainer}>
                  {isOnSale && (
                    <Text style={styles.originalPrice}>{formatPrice(label.price)}</Text>
                  )}
                  <Text style={isOnSale ? styles.salePrice : styles.price}>
                    {formatPrice(displayPrice)}
                  </Text>
                  <Text style={styles.priceLabel}>inkl. moms</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {label.ean && (
                    <Text style={styles.ean}>{label.ean}</Text>
                  )}
                  <Text style={styles.brand}>PhoneSpot</Text>
                </View>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
