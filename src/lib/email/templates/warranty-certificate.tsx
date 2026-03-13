import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Heading,
} from "@react-email/components";

type WarrantyEmailProps = {
  customerName: string;
  guaranteeNumber: string;
  deviceModel: string;
  serialNumber: string | null;
  expiryDate: string;
  pdfUrl: string;
  verificationUrl: string;
};

export function WarrantyCertificateEmail(props: WarrantyEmailProps) {
  return (
    <Html lang="da">
      <Head />
      <Body style={{ fontFamily: "Helvetica, Arial, sans-serif", backgroundColor: "#f5f5f0", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "580px", margin: "0 auto", padding: "40px 20px" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "32px", border: "1px solid #e5e5e5" }}>
            <Heading style={{ fontSize: "22px", color: "#1a1a1a", margin: "0 0 8px" }}>
              Dit garantibevis
            </Heading>
            <Text style={{ fontSize: "14px", color: "#666", margin: "0 0 24px" }}>
              Kære {props.customerName},
            </Text>
            <Text style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
              Tak for dit køb hos PhoneSpot! Hermed dit garantibevis for din nye enhed.
            </Text>

            <Section style={{ backgroundColor: "#f9f9f9", borderRadius: "8px", padding: "20px", margin: "20px 0", border: "1px solid #eee" }}>
              <Text style={{ fontSize: "13px", color: "#666", margin: "0 0 4px" }}>Garantinummer</Text>
              <Text style={{ fontSize: "16px", color: "#16a34a", fontWeight: "bold", margin: "0 0 12px" }}>
                {props.guaranteeNumber}
              </Text>
              <Text style={{ fontSize: "13px", color: "#666", margin: "0 0 4px" }}>Enhed</Text>
              <Text style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "bold", margin: "0 0 12px" }}>
                {props.deviceModel}
              </Text>
              {props.serialNumber && (
                <>
                  <Text style={{ fontSize: "13px", color: "#666", margin: "0 0 4px" }}>Serienummer</Text>
                  <Text style={{ fontSize: "14px", color: "#1a1a1a", margin: "0 0 12px" }}>
                    {props.serialNumber}
                  </Text>
                </>
              )}
              <Text style={{ fontSize: "13px", color: "#666", margin: "0 0 4px" }}>Garanti udløber</Text>
              <Text style={{ fontSize: "14px", color: "#1a1a1a", margin: "0" }}>
                {new Date(props.expiryDate).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </Section>

            <Link
              href={props.pdfUrl}
              style={{
                display: "block",
                backgroundColor: "#1a1a1a",
                color: "#ffffff",
                textAlign: "center",
                padding: "14px 24px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: "bold",
                textDecoration: "none",
                margin: "20px 0",
              }}
            >
              Download garantibevis (PDF)
            </Link>

            <Text style={{ fontSize: "12px", color: "#999", textAlign: "center" }}>
              Du kan også verificere dit garantibevis online:{" "}
              <Link href={props.verificationUrl} style={{ color: "#16a34a" }}>
                Verificer her
              </Link>
            </Text>

            <Hr style={{ borderColor: "#eee", margin: "24px 0" }} />

            <Text style={{ fontSize: "11px", color: "#999", lineHeight: "1.5" }}>
              PhoneSpot tilbyder 36 måneders garanti. Du har desuden altid 24 måneders
              reklamationsret efter købeloven, uafhængigt af denne garanti.
            </Text>
          </Section>

          <Text style={{ fontSize: "11px", color: "#999", textAlign: "center", margin: "16px 0 0" }}>
            PhoneSpot ApS · CVR: 38688766 · VestsjællandsCentret 10, 4200 Slagelse
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
