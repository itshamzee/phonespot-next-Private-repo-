import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface ShippingConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  trackingUrl: string;
  shippingMethod: string;
}

export default function ShippingConfirmationEmail({
  orderNumber,
  customerName,
  trackingNumber,
  trackingUrl,
  shippingMethod,
}: ShippingConfirmationEmailProps) {
  return (
    <Html lang="da">
      <Head />
      <Body style={bodyStyle}>
        {/* Green header bar */}
        <Section style={headerStyle}>
          <Text style={headerTextStyle}>PhoneSpot</Text>
        </Section>

        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>
              Hej {customerName},
            </Text>
            <Text style={headlineStyle}>
              Din ordre {orderNumber} er på vej!
            </Text>
            <Text style={paragraphStyle}>
              Vi har sendt din pakke afsted. Du kan spore din forsendelse med
              sporingsnummeret nedenfor.
            </Text>

            <Hr style={hrStyle} />

            <Text style={labelStyle}>Sporingsnummer</Text>
            <Text style={trackingNumberStyle}>{trackingNumber}</Text>

            {shippingMethod && (
              <>
                <Text style={labelStyle}>Fragtmetode</Text>
                <Text style={paragraphStyle}>{shippingMethod}</Text>
              </>
            )}

            <Hr style={hrStyle} />

            {trackingUrl && (
              <Section style={buttonSectionStyle}>
                <Button href={trackingUrl} style={buttonStyle}>
                  Spor din pakke
                </Button>
              </Section>
            )}

            <Text style={paragraphStyle}>
              Har du spørgsmål? Kontakt os gerne på{" "}
              <a href="mailto:info@phonespot.dk" style={linkStyle}>
                info@phonespot.dk
              </a>{" "}
              eller ring til os på{" "}
              <a href="tel:71994848" style={linkStyle}>
                71 99 48 48
              </a>
              .
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              PhoneSpot | CVR: 38688766 | info@phonespot.dk | 71 99 48 48
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f5f5f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: "0",
  padding: "0",
};

const headerStyle = {
  backgroundColor: "#22c55e",
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

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
};

const trackingNumberStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#111827",
  fontFamily: "monospace",
  margin: "0 0 16px 0",
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const buttonStyle = {
  backgroundColor: "#22c55e",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "6px",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};

const linkStyle = {
  color: "#22c55e",
  textDecoration: "underline",
};

const footerStyle = {
  padding: "16px 40px 24px",
};

const footerTextStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};
