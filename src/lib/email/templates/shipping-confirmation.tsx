import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";
import { BRAND } from "@/lib/email/brand";

interface ShippingConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  trackingUrl: string;
  shippingMethod: string;
  /** BRAND.usps with the guarantee line already resolved for this order's
   *  actual items (see uspsForOrder in lib/email/brand.ts). Defaults to the
   *  unmodified BRAND.usps for callers that don't know the order contents. */
  usps?: readonly string[];
}

export default function ShippingConfirmationEmail({
  orderNumber,
  customerName,
  trackingNumber,
  trackingUrl,
  shippingMethod,
  usps = BRAND.usps,
}: ShippingConfirmationEmailProps) {
  return (
    <Html lang="da">
      <Head />
      <Body style={bodyStyle}>
        {/* Header */}
        <Section style={headerStyle}>
          <a href={BRAND.website} style={{ textDecoration: "none" }}>
            <img
              src={BRAND.logoWhite}
              alt="PhoneSpot"
              height={34}
              style={{ height: "34px", display: "inline-block" }}
            />
          </a>
        </Section>

        <Container style={containerStyle}>
          {/* Progress bar */}
          <Section style={progressBarSectionStyle}>
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{ tableLayout: "fixed" as const }}
            >
              <tbody>
                <tr>
                  <td style={progressStepDoneStyle}>
                    <span style={progressCheckStyle}>&#10003;</span> Ordre
                  </td>
                  <td style={progressArrowStyle}>&rarr;</td>
                  <td style={progressStepActiveStyle}>
                    <span style={progressCheckStyle}>&#10003;</span> Sendt
                  </td>
                  <td style={progressArrowStyle}>&rarr;</td>
                  <td style={progressStepPendingStyle}>Leveret</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hej {customerName},</Text>
            <Text style={headlineStyle}>Din ordre {orderNumber} er på vej!</Text>
            <Text style={paragraphStyle}>
              Vi har sendt din pakke afsted. Du kan spore din forsendelse med
              sporingsnummeret nedenfor.
            </Text>

            {/* Tracking card */}
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={trackingCardStyle}
            >
              <tbody>
                <tr>
                  <td style={trackingCardInnerStyle}>
                    <p style={trackingLabelStyle}>Sporingsnummer</p>
                    <p style={trackingNumberStyle}>{trackingNumber}</p>
                    {shippingMethod && (
                      <>
                        <p style={trackingLabelStyle}>Fragtmetode</p>
                        <p style={trackingCarrierStyle}>{shippingMethod}</p>
                      </>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {trackingUrl && (
              <Section style={buttonSectionStyle}>
                <Button href={trackingUrl} style={buttonStyle}>
                  Spor din pakke
                </Button>
              </Section>
            )}

            <Hr style={hrStyle} />

            {/* Trustpilot review invitation */}
            <Section style={{ textAlign: "center" as const, padding: "16px 0" }}>
              <Text style={{ ...paragraphStyle, marginBottom: "12px" }}>
                Glad for din oplevelse? Vi vil elske at høre fra dig!
              </Text>
              <Button
                href="https://dk.trustpilot.com/evaluate/phonespot.dk"
                style={{
                  ...buttonStyle,
                  backgroundColor: "#00b67a",
                  fontSize: "14px",
                  padding: "12px 28px",
                }}
              >
                Skriv en anmeldelse på Trustpilot
              </Button>
            </Section>

            <Hr style={hrStyle} />

            <Text style={paragraphStyle}>
              Har du spørgsmål? Kontakt os gerne på{" "}
              <Link href={`mailto:${BRAND.email}`} style={linkStyle}>
                {BRAND.email}
              </Link>{" "}
              eller ring til os på{" "}
              <Link href="tel:+4561100048" style={linkStyle}>
                {BRAND.phone}
              </Link>
              .
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* USP section */}
          <Section style={uspSectionStyle}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  {usps.map((usp, i) => (
                    <td key={i} style={uspCellStyle}>
                      <span style={uspCheckStyle}>&#10003;</span>
                      <span style={uspTextStyle}>{usp}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={hrStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerStoreNameStyle}>
              {BRAND.store.name} &middot; {BRAND.store.address}
            </Text>
            <Text style={footerHoursStyle}>{BRAND.store.hours}</Text>
            <Text style={footerContactStyle}>
              <Link href="tel:+4561100048" style={footerPhoneLinkStyle}>
                {BRAND.phone}
              </Link>
              {" · "}
              <Link href={`mailto:${BRAND.email}`} style={footerEmailLinkStyle}>
                {BRAND.email}
              </Link>
            </Text>
            <Text style={footerSocialRowStyle}>
              <Link href={BRAND.facebook} style={facebookBadgeStyle}>
                &#xf; Facebook
              </Link>
              {"  "}
              <Link href={BRAND.trustpilot} style={trustpilotBadgeStyle}>
                &#9733; Trustpilot
              </Link>
            </Text>
            <Text style={footerLegalStyle}>
              PhoneSpot &middot; CVR: {BRAND.cvr}
            </Text>
            <Text style={footerUnsubStyle}>
              Denne e-mail er sendt i forbindelse med din handel hos PhoneSpot.
              Du kan kontakte os på{" "}
              <Link href={`mailto:${BRAND.email}`} style={footerUnsubLinkStyle}>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const bodyStyle = {
  backgroundColor: BRAND.warmWhite,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: "0",
  padding: "0",
};

const headerStyle = {
  backgroundColor: BRAND.green,
  padding: "28px 40px",
  textAlign: "center" as const,
};

const containerStyle = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  margin: "0 auto",
  borderRadius: "0 0 8px 8px",
};

// Progress bar

const progressBarSectionStyle = {
  backgroundColor: BRAND.sand,
  padding: "12px 40px",
};

const progressStepDoneStyle = {
  textAlign: "center" as const,
  fontSize: "12px",
  fontWeight: "700",
  color: BRAND.green,
  padding: "4px 0",
};

const progressStepActiveStyle = {
  textAlign: "center" as const,
  fontSize: "12px",
  fontWeight: "700",
  color: BRAND.green,
  padding: "4px 0",
};

const progressStepPendingStyle = {
  textAlign: "center" as const,
  fontSize: "12px",
  fontWeight: "600",
  color: "#aaa",
  padding: "4px 0",
};

const progressArrowStyle = {
  textAlign: "center" as const,
  fontSize: "14px",
  color: "#aaa",
  width: "24px",
  padding: "0",
};

const progressCheckStyle = {
  color: BRAND.green,
  marginRight: "4px",
};

// Content

const contentStyle = {
  padding: "32px 40px",
};

const greetingStyle = {
  fontSize: "16px",
  color: BRAND.charcoal,
  margin: "0 0 6px 0",
};

const headlineStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: BRAND.charcoal,
  margin: "0 0 16px 0",
};

const paragraphStyle = {
  fontSize: "15px",
  color: "#555",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

// Tracking card

const trackingCardStyle = {
  borderRadius: "8px",
  border: `1px solid ${BRAND.sand}`,
  marginBottom: "24px",
};

const trackingCardInnerStyle = {
  padding: "20px 24px",
};

const trackingLabelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#999",
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  margin: "0 0 4px 0",
};

const trackingNumberStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: BRAND.charcoal,
  fontFamily: "monospace",
  margin: "0 0 16px 0",
  letterSpacing: "0.05em",
};

const trackingCarrierStyle = {
  fontSize: "15px",
  color: BRAND.charcoal,
  margin: "0",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const buttonStyle = {
  backgroundColor: BRAND.green,
  color: "#ffffff",
  padding: "14px 36px",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: "700",
  textDecoration: "none",
  display: "inline-block",
  letterSpacing: "0.2px",
};

const hrStyle = {
  borderColor: BRAND.sand,
  margin: "0",
};

const linkStyle = {
  color: BRAND.green,
  textDecoration: "underline",
};

// USP section

const uspSectionStyle = {
  padding: "20px 40px",
};

const uspCellStyle = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: BRAND.charcoal,
  padding: "0 8px",
  verticalAlign: "top" as const,
  whiteSpace: "nowrap" as const,
};

const uspCheckStyle = {
  color: BRAND.greenLight,
  fontSize: "15px",
  fontWeight: "700",
  marginRight: "4px",
};

const uspTextStyle = {
  fontSize: "12px",
  color: BRAND.charcoal,
};

// Footer

const footerStyle = {
  padding: "20px 40px 32px",
  textAlign: "center" as const,
};

const footerStoreNameStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: BRAND.charcoal,
  margin: "0 0 2px 0",
};

const footerHoursStyle = {
  fontSize: "12px",
  color: "#888",
  margin: "0 0 10px 0",
};

const footerContactStyle = {
  fontSize: "13px",
  color: "#888",
  margin: "0 0 10px 0",
};

const footerPhoneLinkStyle = {
  color: BRAND.charcoal,
  textDecoration: "none",
  fontWeight: "600",
};

const footerEmailLinkStyle = {
  color: BRAND.greenLight,
  textDecoration: "none",
};

const footerSocialRowStyle = {
  fontSize: "12px",
  margin: "0 0 12px 0",
};

const facebookBadgeStyle = {
  display: "inline-block",
  backgroundColor: "#1877F2",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: "600",
  textDecoration: "none",
  marginRight: "6px",
};

const trustpilotBadgeStyle = {
  display: "inline-block",
  backgroundColor: "#00B67A",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: "600",
  textDecoration: "none",
};

const footerLegalStyle = {
  fontSize: "11px",
  color: "#aaa",
  margin: "0 0 6px 0",
};

const footerUnsubStyle = {
  fontSize: "11px",
  color: "#bbb",
  lineHeight: "1.5",
  margin: "0",
};

const footerUnsubLinkStyle = {
  color: "#bbb",
  textDecoration: "underline",
};
