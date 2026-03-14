import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Row,
  Column,
  Link,
} from "@react-email/components";

export interface AbandonedCartEmailProps {
  customerName: string;
  items: Array<{ title: string; price: number }>; // price in øre
  total: number; // øre
  recoveryUrl: string;
}

function formatDKK(øre: number): string {
  return (
    (øre / 100).toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " kr."
  );
}

export const subject = "Du glemte noget i din kurv";
export const from = "ordre@phonespot.dk";

export default function AbandonedCartEmail({
  customerName,
  items,
  total,
  recoveryUrl,
}: AbandonedCartEmailProps) {
  return (
    <Html lang="da">
      <Head />
      <Body style={bodyStyle}>
        {/* Green header */}
        <Section style={headerStyle}>
          <Text style={headerTextStyle}>PhoneSpot.dk</Text>
        </Section>

        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hej {customerName},</Text>
            <Text style={headlineStyle}>
              du har stadig varer i din kurv
            </Text>
            <Text style={paragraphStyle}>
              Du efterlod noget i din kurv. Dine varer er reserveret til dig —
              men kun i begrænset tid.
            </Text>

            <Hr style={hrStyle} />

            {/* Items list header */}
            <Row style={tableHeaderRowStyle}>
              <Column style={colProductStyle}>
                <Text style={tableHeaderTextStyle}>Produkt</Text>
              </Column>
              <Column style={colPriceStyle}>
                <Text style={{ ...tableHeaderTextStyle, textAlign: "right" }}>
                  Pris
                </Text>
              </Column>
            </Row>

            {/* Items */}
            {items.map((item, index) => (
              <Row
                key={index}
                style={index % 2 === 0 ? tableRowEvenStyle : tableRowOddStyle}
              >
                <Column style={colProductStyle}>
                  <Text style={tableCellStyle}>{item.title}</Text>
                </Column>
                <Column style={colPriceStyle}>
                  <Text style={{ ...tableCellStyle, textAlign: "right" }}>
                    {formatDKK(item.price)}
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={hrStyle} />

            {/* Total */}
            <Row style={totalRowStyle}>
              <Column style={colProductStyle}>
                <Text style={totalLabelStyle}>Total</Text>
              </Column>
              <Column style={colPriceStyle}>
                <Text style={totalValueStyle}>{formatDKK(total)}</Text>
              </Column>
            </Row>

            <Hr style={hrStyle} />

            {/* CTA */}
            <Section style={buttonSectionStyle}>
              <Button href={recoveryUrl} style={buttonStyle}>
                Fuldfør dit køb
              </Button>
            </Section>

            {/* Reservation notice */}
            <Text style={reservationNoticeStyle}>
              Dit indhold er reserveret i 24 timer
            </Text>

            <Hr style={hrStyle} />

            <Text style={paragraphStyle}>
              Har du spørgsmål? Kontakt os på{" "}
              <Link href="mailto:info@phonespot.dk" style={linkStyle}>
                info@phonespot.dk
              </Link>{" "}
              eller ring på{" "}
              <Link href="tel:71994848" style={linkStyle}>
                71 99 48 48
              </Link>
              .
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              PhoneSpot.dk — Refurbished elektronik | CVR: 38688766
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles

const bodyStyle = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: "0",
  padding: "0",
};

const headerStyle = {
  backgroundColor: "#16a34a",
  padding: "20px 40px",
};

const headerTextStyle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "-0.5px",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  margin: "0 auto",
};

const contentStyle = {
  padding: "32px 40px",
};

const greetingStyle = {
  fontSize: "16px",
  color: "#374151",
  margin: "0 0 4px 0",
};

const headlineStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 16px 0",
};

const paragraphStyle = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

// Table

const tableHeaderRowStyle = {
  backgroundColor: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const tableHeaderTextStyle = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "6px 0",
};

const tableRowEvenStyle = {
  backgroundColor: "#ffffff",
};

const tableRowOddStyle = {
  backgroundColor: "#f9fafb",
};

const tableCellStyle = {
  fontSize: "14px",
  color: "#374151",
  margin: "10px 0",
  lineHeight: "1.4",
};

const colProductStyle = { width: "70%" };
const colPriceStyle = { width: "30%" };

// Total row

const totalRowStyle = {
  marginBottom: "4px",
};

const totalLabelStyle = {
  fontSize: "15px",
  fontWeight: "700" as const,
  color: "#111827",
  margin: "4px 0",
};

const totalValueStyle = {
  fontSize: "15px",
  fontWeight: "700" as const,
  color: "#111827",
  margin: "4px 0",
  textAlign: "right" as const,
};

// CTA

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
};

const buttonStyle = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  padding: "14px 36px",
  borderRadius: "6px",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};

const reservationNoticeStyle = {
  fontSize: "13px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

const linkStyle = {
  color: "#16a34a",
  textDecoration: "underline",
};

// Footer

const footerStyle = {
  padding: "16px 40px 24px",
};

const footerTextStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};
