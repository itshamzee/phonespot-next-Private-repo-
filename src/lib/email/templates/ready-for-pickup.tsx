import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Img,
  Hr,
} from "@react-email/components";
import { BRAND } from "../brand";

interface ReadyForPickupEmailProps {
  orderNumber: string;
  customerName: string;
  locationName: string;
  locationAddress: string;
  locationPhone?: string; // deprecated — uses BRAND.phone
}

const mapUrl =
  "https://www.google.com/maps/search/?api=1&query=VestsjællandsCentret+10%2C+4200+Slagelse";

export default function ReadyForPickupEmail({
  orderNumber,
  customerName,
  locationName,
  locationAddress,
}: ReadyForPickupEmailProps) {
  const pickupCode = orderNumber.replace(/\D/g, "").slice(-4).padStart(4, "0");

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
          {/* ── Header ── */}
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
          </Section>

          {/* ── Status bar ── */}
          <Section
            style={{
              backgroundColor: "#F0F5F2",
              borderBottom: `1px solid ${BRAND.sand}`,
              padding: "14px 40px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "13px",
                color: BRAND.charcoal,
                letterSpacing: "0.3px",
              }}
            >
              <span style={{ color: "#888" }}>Ordre &#10003;</span>
              <span style={{ color: BRAND.sand, margin: "0 10px" }}>
                &rarr;
              </span>
              <span style={{ color: BRAND.green, fontWeight: 700 }}>
                Klar til afhentning &#10003;
              </span>
            </Text>
          </Section>

          {/* ── Body ── */}
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
              Din ordre er klar!
            </Text>
            <Text
              style={{
                fontSize: "15px",
                color: "#666",
                margin: "0 0 28px",
                lineHeight: "1.6",
              }}
            >
              Hej {customerName}, din ordre{" "}
              <strong style={{ color: BRAND.charcoal }}>{orderNumber}</strong>{" "}
              ligger og venter p&aring; dig i butikken. Vi gl&aelig;der os til
              at se dig!
            </Text>

            {/* ── Pickup code box ── */}
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
                Afhentningskode
              </Text>
              <Text
                style={{
                  margin: "0 0 6px",
                  fontSize: "48px",
                  fontWeight: "700",
                  letterSpacing: "12px",
                  color: BRAND.charcoal,
                  lineHeight: "1",
                }}
              >
                {pickupCode}
              </Text>
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: "12px",
                  color: "#888",
                }}
              >
                Opgiv denne kode ved afhentning
              </Text>
            </Section>

            <Hr
              style={{ borderColor: BRAND.sand, margin: "0 0 24px" }}
            />

            {/* ── Store info ── */}
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
              Afhentningssted
            </Text>

            <Row style={{ marginBottom: "6px" }}>
              <Column style={{ width: "20px", verticalAlign: "top" }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    color: BRAND.green,
                  }}
                >
                  &#8962;
                </Text>
              </Column>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "700",
                    color: BRAND.charcoal,
                  }}
                >
                  {locationName}
                </Text>
                <Text
                  style={{
                    margin: "2px 0 0",
                    fontSize: "14px",
                    color: "#555",
                  }}
                >
                  {locationAddress}
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "6px", marginTop: "10px" }}>
              <Column style={{ width: "20px", verticalAlign: "top" }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: BRAND.green,
                  }}
                >
                  &#128222;
                </Text>
              </Column>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#555",
                  }}
                >
                  <Link
                    href={`tel:+45${BRAND.phone.replace(/\s/g, "")}`}
                    style={{
                      color: BRAND.charcoal,
                      textDecoration: "none",
                      fontWeight: "600",
                    }}
                  >
                    {BRAND.phone}
                  </Link>
                </Text>
              </Column>
            </Row>

            <Row style={{ marginTop: "10px" }}>
              <Column style={{ width: "20px", verticalAlign: "top" }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: BRAND.green,
                  }}
                >
                  &#128337;
                </Text>
              </Column>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#555",
                  }}
                >
                  {BRAND.store.hours}
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: BRAND.sand, margin: "24px 0" }} />

            {/* ── ID notice ── */}
            <Section
              style={{
                backgroundColor: "#FFFBF0",
                border: "1px solid #F0D88C",
                borderRadius: "8px",
                padding: "14px 18px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#7A6000",
                  lineHeight: "1.5",
                }}
              >
                <strong>Husk:</strong> Medbring gyldig billedlegitimation
                (k&oslash;rekort, pas eller sundhedskort).
              </Text>
            </Section>

            {/* ── Map link ── */}
            <Section style={{ textAlign: "center", marginBottom: "8px" }}>
              <Link
                href={mapUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: BRAND.green,
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "13px 28px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  letterSpacing: "0.2px",
                }}
              >
                &#128205;&nbsp; Se rutevejledning
              </Link>
            </Section>
          </Section>

          {/* ── USP bar ── */}
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

          {/* ── Footer ── */}
          <Section
            style={{
              backgroundColor: BRAND.warmWhite,
              borderTop: `1px solid ${BRAND.sand}`,
              padding: "20px 40px 28px",
              textAlign: "center",
            }}
          >
            <Text
              style={{ margin: "0 0 6px", fontSize: "13px", color: BRAND.charcoal }}
            >
              <strong>{BRAND.store.name}</strong> &middot;{" "}
              {BRAND.store.address}
            </Text>
            <Text style={{ margin: "0 0 10px", fontSize: "12px", color: "#888" }}>
              <Link
                href={`tel:+4561100048`}
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

            <Text style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa" }}>
              PhoneSpot &middot; CVR: {BRAND.cvr}
            </Text>
            <Text style={{ margin: 0, fontSize: "11px", color: "#bbb", lineHeight: "1.5" }}>
              Denne e-mail er sendt i forbindelse med din handel hos PhoneSpot.
              Kontakt os p&aring;{" "}
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
