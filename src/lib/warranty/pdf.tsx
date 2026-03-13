import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  guaranteeNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
    textAlign: "right",
  },
  qrContainer: {
    alignItems: "flex-end",
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  qrText: {
    fontSize: 7,
    color: "#999",
    marginTop: 2,
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontSize: 10,
    color: "#666",
  },
  value: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    flex: 1,
  },
  legalBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  legalTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#1a1a1a",
  },
  legalText: {
    fontSize: 8,
    lineHeight: 1.4,
    color: "#555",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
  },
});

type WarrantyPDFProps = {
  guaranteeNumber: string;
  deviceModel: string;
  serialNumber: string | null;
  imei: string | null;
  grade: string;
  storage: string | null;
  color: string | null;
  customerName: string;
  purchaseDate: string;
  expiryDate: string;
  qrCodeDataUrl: string;
};

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const GRADE_LABELS: Record<string, string> = {
  A: "A — Perfekt stand",
  B: "B — Let brugt",
  C: "C — Synlig slitage",
};

export function WarrantyPDF(props: WarrantyPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Garantibevis</Text>
            <Text style={styles.subtitle}>PhoneSpot ApS — Refurbished Electronics</Text>
          </View>
          <View style={styles.qrContainer}>
            <Image src={props.qrCodeDataUrl} style={styles.qrImage} />
            <Text style={styles.qrText}>Scan for at verificere</Text>
            <Text style={styles.guaranteeNumber}>{props.guaranteeNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhed</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Model:</Text>
            <Text style={styles.value}>{props.deviceModel}</Text>
          </View>
          {props.serialNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Serienummer:</Text>
              <Text style={styles.value}>{props.serialNumber}</Text>
            </View>
          )}
          {props.imei && (
            <View style={styles.row}>
              <Text style={styles.label}>IMEI:</Text>
              <Text style={styles.value}>{props.imei}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Stand:</Text>
            <Text style={styles.value}>{GRADE_LABELS[props.grade] || props.grade}</Text>
          </View>
          {props.storage && (
            <View style={styles.row}>
              <Text style={styles.label}>Lagerplads:</Text>
              <Text style={styles.value}>{props.storage}</Text>
            </View>
          )}
          {props.color && (
            <View style={styles.row}>
              <Text style={styles.label}>Farve:</Text>
              <Text style={styles.value}>{props.color}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Garanti</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Kunde:</Text>
            <Text style={styles.value}>{props.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Købsdato:</Text>
            <Text style={styles.value}>{formatDate(props.purchaseDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Garanti udløber:</Text>
            <Text style={styles.value}>{formatDate(props.expiryDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Garantiperiode:</Text>
            <Text style={styles.value}>36 måneder</Text>
          </View>
        </View>

        <View style={styles.legalBox}>
          <Text style={styles.legalTitle}>Om din garanti</Text>
          <Text style={styles.legalText}>
            PhoneSpot tilbyder 36 måneders garanti på denne enhed. Garantien dækker fabrikations- og funktionsfejl, der ikke skyldes normal slid, uheld, eller forkert brug.
          </Text>
          <Text style={[styles.legalText, { marginTop: 6 }]}>
            Garantien dækker IKKE: Fysisk skade (fald, tryk, væske), batterislid (batterier er forbrugsvarer), software-problemer, skader forårsaget af uautoriseret reparation, kosmetiske fejl der var til stede ved køb (se stand-klassificering).
          </Text>
          <Text style={[styles.legalText, { marginTop: 6 }]}>
            Sådan reklamerer du: Kontakt os på info@phonespot.dk eller besøg en af vores butikker med dette garantibevis og enheden. Vi vurderer sagen inden for 5 hverdage.
          </Text>
          <Text style={[styles.legalTitle, { marginTop: 10 }]}>Lovbestemt reklamationsret</Text>
          <Text style={styles.legalText}>
            Du har altid 24 måneders reklamationsret efter købeloven. Denne rettighed er uafhængig af PhoneSpots garanti og gælder uanset garantiens vilkår. I de første 12 måneder formodes fejl at have været til stede ved leveringen.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>PhoneSpot ApS · CVR: 38688766 · VestsjællandsCentret 10, 4200 Slagelse</Text>
          <Text>info@phonespot.dk · phonespot.dk</Text>
        </View>
      </Page>
    </Document>
  );
}
