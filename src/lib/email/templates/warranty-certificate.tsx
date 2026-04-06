import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Button,
  Link,
  Img,
  Hr,
} from "@react-email/components";
import { BRAND } from "../brand";

type WarrantyEmailProps = {
  customerName: string;
  guaranteeNumber: string;
  deviceModel: string;
  serialNumber: string | null;
  expiryDate: string;
  pdfUrl: string;
  verificationUrl: string;
};

const COVERED_ITEMS = [
  "Hardware-fejl og fabrikationsfejl",
  "Defekt skærm (ikke ved fysisk beskadigelse)",
  "Batteri under 80% kapacitet inden for garantiperioden",
  "Fejl på knapper, kamera og opladningsport",
  "Softwareproblemer relateret til hardware",
];

export function WarrantyCertificateEmail(props: WarrantyEmailProps) {
  const formattedExpiry = new Date(props.expiryDate).toLocaleDateString(
    "da-DK",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <Html lang="da">
      <Head />
      <Body
        style={{
          backgroundColor: BRAND.warmWhite,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            maxWidth: "580px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            overflow: "hidden",
            border: `1px solid ${BRAND.sand}`,
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: BRAND.green,
              padding: "28px 40px",
              textAlign: "center",
            }}
          >
            <Link href={BRAND.website} style={{ textDecoration: "none" }}>
              <Img
                src={BRAND.logoWhite}
                alt="PhoneSpot"
                height={34}
                style={{ display: "inline-block", height: "34px" }}
              />
            </Link>
            <Text
              style={{
                margin: "8px 0 0",
                fontSize: "13px",
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.5px",
              }}
            >
              Garantibevis
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "36px 40px 28px" }}>
            <Text
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: BRAND.charcoal,
                margin: "0 0 6px",
                lineHeight: "1.3",
              }}
            >
              Dit garantibevis er klar
            </Text>
            <Text
              style={{
                fontSize: "15px",
                color: "#666",
                margin: "0 0 28px",
                lineHeight: "1.6",
              }}
            >
              Kære {props.customerName}, tak for dit køb hos PhoneSpot. Herunder
              finder du dit officielle garantibevis for din enhed.
            </Text>

            {/* Guarantee number box */}
            <Section
              style={{
                backgroundColor: BRAND.warmWhite,
                border: `2px solid ${BRAND.green}`,
                borderRadius: "10px",
                padding: "24px 28px",
                textAlign: "center",
                marginBottom: "28px",
              }}
            >
              <Text
                style={{
                  margin: "0 0 6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: BRAND.green,
                }}
              >
                Garantinummer
              </Text>
              <Text
                style={{
                  margin: "0 0 4px",
                  fontSize: "26px",
                  fontWeight: "700",
                  letterSpacing: "4px",
                  color: BRAND.charcoal,
                  lineHeight: "1.2",
                }}
              >
                {props.guaranteeNumber}
              </Text>
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: "12px",
                  color: "#888",
                }}
              >
                Opbevar dette nummer til evt. reklamation
              </Text>
            </Section>

            {/* Device details */}
            <Section
              style={{
                backgroundColor: "#F9F8F5",
                border: `1px solid ${BRAND.sand}`,
                borderRadius: "8px",
                padding: "20px 24px",
                marginBottom: "28px",
              }}
            >
              <Row style={{ marginBottom: "14px" }}>
                <Column style={{ width: "50%" }}>
                  <Text
                    style={{
                      margin: "0 0 3px",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      color: "#888",
                    }}
                  >
                    Enhed
                  </Text>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: "700",
                      color: BRAND.charcoal,
                    }}
                  >
                    {props.deviceModel}
                  </Text>
                </Column>
                <Column style={{ width: "50%" }}>
                  <Text
                    style={{
                      margin: "0 0 3px",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      color: "#888",
                    }}
                  >
                    Garanti udløber
                  </Text>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: "700",
                      color: BRAND.charcoal,
                    }}
                  >
                    {formattedExpiry}
                  </Text>
                </Column>
              </Row>

              {props.serialNumber && (
                <Row>
                  <Column>
                    <Text
                      style={{
                        margin: "0 0 3px",
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                        color: "#888",
                      }}
                    >
                      Serienummer
                    </Text>
                    <Text
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: BRAND.charcoal,
                        fontFamily: "Courier New, Courier, monospace",
                      }}
                    >
                      {props.serialNumber}
                    </Text>
                  </Column>
                </Row>
              )}

              <Hr style={{ borderColor: BRAND.sand, margin: "16px 0" }} />

              <Row>
                <Column>
                  <Text
                    style={{
                      margin: "0 0 3px",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      color: "#888",
                    }}
                  >
                    Garantiperiode
                  </Text>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: BRAND.green,
                      fontWeight: "700",
                    }}
                  >
                    36 måneder fra købsdato
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* CTA buttons */}
            <Row style={{ marginBottom: "28px" }}>
              <Column style={{ width: "50%", paddingRight: "8px" }}>
                <Link
                  href={props.pdfUrl}
                  style={{
                    display: "block",
                    backgroundColor: BRAND.green,
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "13px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: "0.2px",
                  }}
                >
                  Download PDF
                </Link>
              </Column>
              <Column style={{ width: "50%", paddingLeft: "8px" }}>
                <Link
                  href={props.verificationUrl}
                  style={{
                    display: "block",
                    backgroundColor: "#ffffff",
                    color: BRAND.green,
                    textDecoration: "none",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: "0.2px",
                    border: `2px solid ${BRAND.green}`,
                  }}
                >
                  Verificér online
                </Link>
              </Column>
            </Row>

            <Hr style={{ borderColor: BRAND.sand, margin: "0 0 24px" }} />

            {/* What's covered */}
            <Text
              style={{
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: BRAND.green,
                margin: "0 0 14px",
              }}
            >
              Hvad dækker garantien?
            </Text>

            {COVERED_ITEMS.map((item, i) => (
              <Row key={i} style={{ marginBottom: "8px" }}>
                <Column style={{ width: "24px", verticalAlign: "top" }}>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: BRAND.greenLight,
                      fontWeight: "700",
                    }}
                  >
                    &#10003;
                  </Text>
                </Column>
                <Column>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: BRAND.charcoal,
                      lineHeight: "1.5",
                    }}
                  >
                    {item}
                  </Text>
                </Column>
              </Row>
            ))}

            <Section
              style={{
                backgroundColor: "#FFFBF0",
                border: "1px solid #F0D88C",
                borderRadius: "8px",
                padding: "14px 18px",
                marginTop: "20px",
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#7A6000",
                  lineHeight: "1.6",
                }}
              >
                <strong>Bemærk:</strong> Garantien dækker ikke fysisk
                beskadigelse, vandskade eller uautoriserede reparationer. Du har
                desuden altid 24 måneders reklamationsret efter købeloven,
                uafhængigt af denne garanti.
              </Text>
            </Section>

            <Hr style={{ borderColor: BRAND.sand, margin: "24px 0 0" }} />

            {/* ── Trustpilot review invitation ── */}
            <Section style={{ textAlign: "center" as const, padding: "16px 0" }}>
              <Text
                style={{
                  fontSize: "15px",
                  color: "#555",
                  lineHeight: "1.6",
                  margin: "0 0 12px",
                }}
              >
                Glad for din oplevelse? Vi vil elske at høre fra dig!
              </Text>
              <Button
                href="https://dk.trustpilot.com/evaluate/phonespot.dk"
                style={{
                  backgroundColor: "#00b67a",
                  color: "#ffffff",
                  padding: "12px 28px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                Skriv en anmeldelse på Trustpilot
              </Button>
            </Section>
          </Section>

          {/* USP bar */}
          <Section
            style={{
              borderTop: `1px solid ${BRAND.sand}`,
              padding: "20px 24px",
            }}
          >
            <Row>
              {BRAND.usps.map((usp, i) => (
                <Column
                  key={i}
                  style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: BRAND.charcoal,
                    padding: "0 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      color: BRAND.greenLight,
                      fontWeight: 700,
                      marginRight: "4px",
                      fontSize: "14px",
                    }}
                  >
                    &#10003;
                  </span>
                  {usp}
                </Column>
              ))}
            </Row>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: BRAND.warmWhite,
              borderTop: `1px solid ${BRAND.sand}`,
              padding: "20px 40px 28px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                margin: "0 0 6px",
                fontSize: "13px",
                color: BRAND.charcoal,
              }}
            >
              <strong>{BRAND.store.name}</strong> &middot;{" "}
              {BRAND.store.address}
            </Text>
            <Text
              style={{ margin: "0 0 10px", fontSize: "12px", color: "#888" }}
            >
              <Link
                href="tel:+4561100048"
                style={{
                  color: BRAND.charcoal,
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                {BRAND.phone}
              </Link>
              &nbsp;&middot;&nbsp;
              <Link
                href={`mailto:${BRAND.email}`}
                style={{ color: BRAND.greenLight, textDecoration: "none" }}
              >
                {BRAND.email}
              </Link>
            </Text>

            {/* Social */}
            <Row style={{ marginBottom: "14px" }}>
              <Column style={{ textAlign: "center" }}>
                <Link
                  href={BRAND.facebook}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#1877F2",
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    marginRight: "8px",
                  }}
                >
                  &#402; Facebook
                </Link>
                <Link
                  href={BRAND.trustpilot}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#00B67A",
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  &#9733; Trustpilot
                </Link>
              </Column>
            </Row>

            <Text
              style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa" }}
            >
              PhoneSpot &middot; CVR: {BRAND.cvr}
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#bbb",
                lineHeight: "1.5",
              }}
            >
              Denne e-mail er sendt i forbindelse med din handel hos PhoneSpot.
              Kontakt os på{" "}
              <Link
                href={`mailto:${BRAND.email}`}
                style={{ color: "#bbb", textDecoration: "underline" }}
              >
                {BRAND.email}
              </Link>{" "}
              for at afmelde transaktionsmails.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
