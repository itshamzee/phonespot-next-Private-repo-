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

interface InvoiceEmailProps {
  draftNumber: string;
  customerName: string;
  lineItems: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentUrl: string;
  customerNote?: string;
}

function formatDKK(øre: number): string {
  return (øre / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " kr.";
}

export const subject = (draftNumber: string) =>
  `Faktura ${draftNumber} fra PhoneSpot`;

export const from = "ordre@phonespot.dk";

export default function InvoiceEmail({
  draftNumber,
  customerName,
  lineItems,
  subtotal,
  taxAmount,
  total,
  paymentUrl,
  customerNote,
}: InvoiceEmailProps) {
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
            <Text style={paragraphStyle}>
              Her er din faktura fra PhoneSpot.
            </Text>

            <Text style={invoiceNumberStyle}>Faktura {draftNumber}</Text>

            <Hr style={hrStyle} />

            {/* Line items table header */}
            <Row style={tableHeaderRowStyle}>
              <Column style={colProductStyle}>
                <Text style={tableHeaderTextStyle}>Produkt</Text>
              </Column>
              <Column style={colQtyStyle}>
                <Text style={{ ...tableHeaderTextStyle, textAlign: "center" }}>
                  Antal
                </Text>
              </Column>
              <Column style={colPriceStyle}>
                <Text style={{ ...tableHeaderTextStyle, textAlign: "right" }}>
                  Stykpris
                </Text>
              </Column>
              <Column style={colTotalStyle}>
                <Text style={{ ...tableHeaderTextStyle, textAlign: "right" }}>
                  Total
                </Text>
              </Column>
            </Row>

            {/* Line items */}
            {lineItems.map((item, index) => (
              <Row
                key={index}
                style={index % 2 === 0 ? tableRowEvenStyle : tableRowOddStyle}
              >
                <Column style={colProductStyle}>
                  <Text style={tableCellStyle}>{item.title}</Text>
                </Column>
                <Column style={colQtyStyle}>
                  <Text style={{ ...tableCellStyle, textAlign: "center" }}>
                    {item.quantity}
                  </Text>
                </Column>
                <Column style={colPriceStyle}>
                  <Text style={{ ...tableCellStyle, textAlign: "right" }}>
                    {formatDKK(item.unitPrice)}
                  </Text>
                </Column>
                <Column style={colTotalStyle}>
                  <Text style={{ ...tableCellStyle, textAlign: "right" }}>
                    {formatDKK(item.lineTotal)}
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={hrStyle} />

            {/* Summary */}
            <Row style={summaryRowStyle}>
              <Column style={summaryLabelColStyle}>
                <Text style={summaryLabelStyle}>Subtotal</Text>
              </Column>
              <Column style={summaryValueColStyle}>
                <Text style={summaryValueStyle}>{formatDKK(subtotal)}</Text>
              </Column>
            </Row>
            <Row style={summaryRowStyle}>
              <Column style={summaryLabelColStyle}>
                <Text style={summaryLabelStyle}>Moms (25%)</Text>
              </Column>
              <Column style={summaryValueColStyle}>
                <Text style={summaryValueStyle}>{formatDKK(taxAmount)}</Text>
              </Column>
            </Row>
            <Row style={summaryRowStyle}>
              <Column style={summaryLabelColStyle}>
                <Text style={summaryTotalLabelStyle}>Total</Text>
              </Column>
              <Column style={summaryValueColStyle}>
                <Text style={summaryTotalValueStyle}>{formatDKK(total)}</Text>
              </Column>
            </Row>

            {/* Customer note */}
            {customerNote && (
              <>
                <Hr style={hrStyle} />
                <Text style={noteLabelStyle}>Note</Text>
                <Text style={noteTextStyle}>{customerNote}</Text>
              </>
            )}

            <Hr style={hrStyle} />

            {/* CTA button */}
            <Section style={buttonSectionStyle}>
              <Button href={paymentUrl} style={buttonStyle}>
                Betal nu
              </Button>
            </Section>

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
              PhoneSpot.dk — Refurbished elektronik
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
  margin: "0 0 8px 0",
};

const paragraphStyle = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const invoiceNumberStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 8px 0",
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
  margin: "8px 0",
  lineHeight: "1.4",
};

const colProductStyle = { width: "50%" };
const colQtyStyle = { width: "10%" };
const colPriceStyle = { width: "20%" };
const colTotalStyle = { width: "20%" };

// Summary

const summaryRowStyle = {
  marginBottom: "4px",
};

const summaryLabelColStyle = { width: "70%" };
const summaryValueColStyle = { width: "30%" };

const summaryLabelStyle = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "4px 0",
  textAlign: "right" as const,
  paddingRight: "16px",
};

const summaryValueStyle = {
  fontSize: "14px",
  color: "#374151",
  margin: "4px 0",
  textAlign: "right" as const,
};

const summaryTotalLabelStyle = {
  ...summaryLabelStyle,
  fontWeight: "700" as const,
  color: "#111827",
};

const summaryTotalValueStyle = {
  ...summaryValueStyle,
  fontWeight: "700" as const,
  fontSize: "16px",
  color: "#111827",
};

// Note

const noteLabelStyle = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
};

const noteTextStyle = {
  fontSize: "14px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
  backgroundColor: "#f9fafb",
  padding: "12px 16px",
  borderRadius: "4px",
  borderLeft: "3px solid #16a34a",
};

// CTA

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const buttonStyle = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "6px",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
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
