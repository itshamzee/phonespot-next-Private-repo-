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

interface RefundConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  refundAmount: number;
  reason: string;
}

function formatAmount(oerer: number): string {
  const kr = oerer / 100;
  return (
    new Intl.NumberFormat("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(kr) + " kr."
  );
}

export default function RefundConfirmationEmail({
  orderNumber,
  customerName,
  refundAmount,
  reason,
}: RefundConfirmationEmailProps) {
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
            <Text
              style={{
                margin: "8px 0 0",
                fontSize: "13px",
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.5px",
              }}
            >
              Refusion bekræftet
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
              Vi har refunderet dit beløb
            </Text>
            <Text
              style={{
                fontSize: "15px",
                color: "#666",
                margin: "0 0 28px",
                lineHeight: "1.6",
              }}
            >
              Hej {customerName}, din refusion for ordre{" "}
              <strong style={{ color: BRAND.charcoal }}>{orderNumber}</strong>{" "}
              er behandlet og på vej tilbage til dig.
            </Text>

            {/* ── Refund amount box ── */}
            <Section
              style={{
                backgroundColor: BRAND.warmWhite,
                border: `2px solid ${BRAND.green}`,
                borderRadius: "10px",
                padding: "28px",
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
                Refunderet beløb
              </Text>
              <Text
                style={{
                  margin: "0 0 4px",
                  fontSize: "40px",
                  fontWeight: "700",
                  color: BRAND.charcoal,
                  lineHeight: "1.1",
                }}
              >
                {formatAmount(refundAmount)}
              </Text>
              <Text
                style={{
                  margin: "10px 0 0",
                  fontSize: "13px",
                  color: "#888",
                  lineHeight: "1.5",
                }}
              >
                Beløbet forventes på din konto inden for{" "}
                <strong style={{ color: BRAND.charcoal }}>3&#8209;5 hverdage</strong>,
                afhængigt af din bank eller kortudsteder.
              </Text>
            </Section>

            <Hr style={{ borderColor: BRAND.sand, margin: "0 0 24px" }} />

            {/* ── Reason ── */}
            <Text
              style={{
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: BRAND.green,
                margin: "0 0 10px",
              }}
            >
              Årsag til refusion
            </Text>
            <Text
              style={{
                fontSize: "15px",
                color: BRAND.charcoal,
                margin: "0 0 28px",
                lineHeight: "1.6",
                backgroundColor: BRAND.warmWhite,
                borderLeft: `3px solid ${BRAND.green}`,
                padding: "12px 16px",
                borderRadius: "0 6px 6px 0",
              }}
            >
              {reason}
            </Text>

            <Hr style={{ borderColor: BRAND.sand, margin: "0 0 24px" }} />

            {/* ── Timeline ── */}
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
              Hvad sker der nu?
            </Text>

            <Row style={{ marginBottom: "10px" }}>
              <Column
                style={{
                  width: "28px",
                  verticalAlign: "top",
                  paddingTop: "2px",
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    width: "20px",
                    height: "20px",
                    backgroundColor: BRAND.green,
                    borderRadius: "50%",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "700",
                    textAlign: "center",
                    lineHeight: "20px",
                    display: "inline-block",
                  }}
                >
                  1
                </Text>
              </Column>
              <Column>
                <Text
                  style={{ margin: 0, fontSize: "14px", color: BRAND.charcoal }}
                >
                  Refusionen er behandlet hos PhoneSpot
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "10px" }}>
              <Column
                style={{
                  width: "28px",
                  verticalAlign: "top",
                  paddingTop: "2px",
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    width: "20px",
                    height: "20px",
                    backgroundColor: BRAND.greenLight,
                    borderRadius: "50%",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "700",
                    textAlign: "center",
                    lineHeight: "20px",
                    display: "inline-block",
                  }}
                >
                  2
                </Text>
              </Column>
              <Column>
                <Text
                  style={{ margin: 0, fontSize: "14px", color: BRAND.charcoal }}
                >
                  Betalingsudbyder sender beløbet videre (1&#8209;2 hverdage)
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "28px" }}>
              <Column
                style={{
                  width: "28px",
                  verticalAlign: "top",
                  paddingTop: "2px",
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    width: "20px",
                    height: "20px",
                    backgroundColor: BRAND.sand,
                    borderRadius: "50%",
                    color: BRAND.charcoal,
                    fontSize: "11px",
                    fontWeight: "700",
                    textAlign: "center",
                    lineHeight: "20px",
                    display: "inline-block",
                  }}
                >
                  3
                </Text>
              </Column>
              <Column>
                <Text
                  style={{ margin: 0, fontSize: "14px", color: "#888" }}
                >
                  Pengene er på din konto (op til 5 hverdage i alt)
                </Text>
              </Column>
            </Row>

            {/* ── Contact ── */}
            <Section
              style={{
                backgroundColor: "#F0F5F2",
                border: `1px solid ${BRAND.sand}`,
                borderRadius: "8px",
                padding: "16px 20px",
              }}
            >
              <Text
                style={{
                  margin: "0 0 6px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: BRAND.charcoal,
                }}
              >
                Har du spørgsmål?
              </Text>
              <Text
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#555",
                  lineHeight: "1.6",
                }}
              >
                Kontakt os på{" "}
                <Link
                  href={`mailto:${BRAND.email}`}
                  style={{ color: BRAND.greenLight, textDecoration: "none", fontWeight: "600" }}
                >
                  {BRAND.email}
                </Link>{" "}
                eller ring på{" "}
                <Link
                  href="tel:+4561100048"
                  style={{ color: BRAND.charcoal, textDecoration: "none", fontWeight: "700" }}
                >
                  {BRAND.phone}
                </Link>
                . Vi er klar til at hjælpe dig.
              </Text>
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

            <Text style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa" }}>
              PhoneSpot &middot; CVR: {BRAND.cvr}
            </Text>
            <Text style={{ margin: 0, fontSize: "11px", color: "#bbb", lineHeight: "1.5" }}>
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
