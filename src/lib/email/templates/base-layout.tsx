// src/lib/email/templates/base-layout.tsx
import {
  Html, Head, Body, Container, Section, Text, Hr, Link,
} from "@react-email/components";
import type { StaffProfile, CompanySettings } from "@/lib/supabase/email-types";
import { STORES } from "@/lib/store-config";
import { buildSignature, displayPhone, websiteLabel, type Signature } from "@/lib/email/signature";

interface BaseLayoutProps {
  children: React.ReactNode;
  /** Resolved signature (preferred). */
  signature?: Signature | null;
  /** Legacy: a staff profile to sign with; converted to a Signature. */
  staffProfile?: StaffProfile | null;
  companySettings?: CompanySettings | null;
  previewText?: string;
}

const headerBg = "#3A3D38";
const accentGreen = "#5A8C6F";
const textColor = "#333333";
const mutedText = "#888888";

export default function BaseLayout({
  children,
  signature,
  staffProfile,
  companySettings,
  previewText,
}: BaseLayoutProps) {
  const sig: Signature | null =
    signature ??
    (staffProfile
      ? buildSignature({ mailbox: staffProfile.mailbox ?? null, staff: staffProfile, company: companySettings ?? null })
      : null);
  const company = companySettings || {
    company_name: "PhoneSpot",
    address: STORES.slagelse.street,
    postal_city: `${STORES.slagelse.zip} ${STORES.slagelse.city}`,
    phone: "+45 61 10 00 48",
    email: "info@phonespot.dk",
    website: "https://phonespot.dk",
    logo_url: null,
  };

  return (
    <Html lang="da">
      <Head />
      <Body style={bodyStyle}>
        {previewText && (
          <Text style={{ display: "none", maxHeight: 0, overflow: "hidden" } as const}>
            {previewText}
          </Text>
        )}
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={logoTextStyle}>{company.company_name}</Text>
            <Text style={logoSubtextStyle}>Refurbished Electronics</Text>
          </Section>

          {/* Body */}
          <Section style={contentStyle}>
            {children}
          </Section>

          {/* Signature */}
          {sig && (
            <Section style={signatureSection}>
              <Hr style={signatureDivider} />
              <Text style={sigNameStyle}>{sig.name}</Text>
              {sig.title && <Text style={sigTitleStyle}>{sig.title}</Text>}
              <Text style={sigCompanyName}>{sig.company.toUpperCase()}</Text>
              <Text style={sigContactStyle}>
                <span style={sigLabel}>Telefon</span>
                <Link href={`tel:${sig.phone.replace(/\s+/g, "")}`} style={sigLink}>{displayPhone(sig.phone)}</Link>
              </Text>
              <Text style={sigContactStyle}>
                <span style={sigLabel}>Mail</span>
                <Link href={`mailto:${sig.email}`} style={sigLink}>{sig.email}</Link>
              </Text>
              <Text style={sigContactStyle}>
                <span style={sigLabel}>Web</span>
                <Link href={sig.website} style={sigLink}>{websiteLabel(sig.website)}</Link>
              </Text>
              {sig.cvr && (
                <Text style={sigContactStyle}>
                  <span style={sigLabel}>CVR</span>
                  {sig.cvr}
                </Text>
              )}
              {sig.trustpilotUrl && (
                <Text style={sigTrustpilot}>
                  Bedøm os på Trustpilot{" · "}
                  <Link href={sig.trustpilotUrl} style={sigTrustpilotLink}>Skriv en anmeldelse</Link>
                </Text>
              )}
            </Section>
          )}

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              {company.company_name} | {company.address}, {company.postal_city}
            </Text>
            <Text style={footerTextStyle}>
              <Link href={`tel:${company.phone}`} style={footerLinkStyle}>{company.phone}</Link>
              {" | "}
              <Link href={company.website || "https://phonespot.dk"} style={footerLinkStyle}>
                {company.website?.replace("https://", "")}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// --- Styles ---
const bodyStyle = {
  backgroundColor: "#f4f4f4",
  fontFamily: "Arial, sans-serif",
  margin: "0",
  padding: "0",
} as const;

const containerStyle = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
} as const;

const headerStyle = {
  backgroundColor: headerBg,
  padding: "24px 32px",
  textAlign: "center" as const,
} as const;

const logoTextStyle = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "bold" as const,
  margin: "0",
  letterSpacing: "0.5px",
} as const;

const logoSubtextStyle = {
  color: "#cccccc",
  fontSize: "11px",
  margin: "4px 0 0 0",
} as const;

const contentStyle = {
  padding: "32px",
} as const;

const signatureSection = {
  padding: "0 32px 24px 32px",
} as const;

const signatureDivider = {
  borderTop: `2px solid ${headerBg}`,
  marginBottom: "16px",
} as const;

const sigNameStyle = {
  fontWeight: "bold" as const,
  fontSize: "15px",
  color: headerBg,
  margin: "0",
} as const;

const sigTitleStyle = {
  fontSize: "12px",
  color: mutedText,
  margin: "2px 0 0 0",
} as const;

const sigCompanyName = {
  fontSize: "11px",
  fontWeight: "bold" as const,
  color: accentGreen,
  letterSpacing: "2px",
  margin: "4px 0 10px 0",
} as const;

const sigContactStyle = {
  fontSize: "12px",
  color: textColor,
  margin: "0 0 3px 0",
  lineHeight: "1.4",
} as const;

const sigLabel = {
  display: "inline-block",
  width: "58px",
  color: mutedText,
} as const;

const sigLink = {
  color: textColor,
  textDecoration: "none" as const,
} as const;

const sigTrustpilot = {
  fontSize: "12px",
  color: mutedText,
  margin: "12px 0 0 0",
} as const;

const sigTrustpilotLink = {
  color: accentGreen,
  fontWeight: "bold" as const,
  textDecoration: "underline" as const,
} as const;

const footerStyle = {
  backgroundColor: "#f9f9f9",
  padding: "16px 32px",
  textAlign: "center" as const,
} as const;

const footerTextStyle = {
  fontSize: "11px",
  color: mutedText,
  margin: "2px 0",
} as const;

const footerLinkStyle = {
  color: mutedText,
  textDecoration: "underline" as const,
} as const;
