// src/lib/email/templates/base-layout.tsx
import {
  Html, Head, Body, Container, Section, Text, Link,
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

          {/* Signature: same look as the one.com webmail signature */}
          {sig && (
            <Section style={signatureSection}>
              <table cellPadding={0} cellSpacing={0} role="presentation" style={sigTable}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={sigLogoCell}>
                      <Link href={sig.website}>
                        <img src={sig.logoUrl} alt={sig.company} width={180} style={sigLogo} />
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    {sig.photoUrl && (
                      <td valign="top" style={sigPhotoCell}>
                        <img src={sig.photoUrl} alt={sig.name} width={80} height={80} style={sigPhoto} />
                      </td>
                    )}
                    <td valign="top" style={sigDetailsCell}>
                      <div style={sigNameStyle}>{sig.name}</div>
                      {sig.title && <div style={sigTitleStyle}>{sig.title}</div>}
                      <div style={sigCompanyName}>{sig.company.toUpperCase()}</div>
                      <table cellPadding={0} cellSpacing={0} role="presentation" style={sigRows}>
                        <tbody>
                          <SigRow label="Tlf.">
                            <Link href={`tel:${sig.phone.replace(/\s+/g, "")}`} style={sigLink}>{displayPhone(sig.phone)}</Link>
                          </SigRow>
                          {sig.mobile && (
                            <SigRow label="Mobil">
                              <Link href={`tel:${sig.mobile.replace(/\s+/g, "")}`} style={sigLink}>{displayPhone(sig.mobile)}</Link>
                            </SigRow>
                          )}
                          <SigRow label="Mail">
                            <Link href={`mailto:${sig.email}`} style={sigMailLink}>{sig.email}</Link>
                          </SigRow>
                          <SigRow label="Web">
                            <Link href={sig.website} style={sigLink}>{websiteLabel(sig.website)}</Link>
                          </SigRow>
                        </tbody>
                      </table>
                      {sig.cvr && <div style={sigCvr}>CVR: {sig.cvr}</div>}
                      {sig.trustpilotUrl && (
                        <div style={{ paddingTop: "8px" }}>
                          <Link href={sig.trustpilotUrl} style={sigTrustpilotLink}>Bedøm os på Trustpilot</Link>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
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

function SigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td style={sigLabel}>{label}</td>
      <td style={sigValue}>{children}</td>
    </tr>
  );
}

const sigGreen = "#2e7d4f";

const sigTable = {
  borderCollapse: "collapse" as const,
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#1d1d1f",
} as const;

const sigLogoCell = {
  padding: "0 0 8px 0",
  borderBottom: `2px solid ${sigGreen}`,
} as const;

const sigLogo = {
  display: "block",
  border: "0",
  width: "180px",
  height: "auto",
} as const;

const sigPhotoCell = {
  padding: "12px 14px 0 0",
  width: "80px",
} as const;

const sigPhoto = {
  display: "block",
  border: "0",
  width: "80px",
  height: "80px",
  borderRadius: "40px",
} as const;

const sigDetailsCell = {
  padding: "12px 0 0 0",
} as const;

const sigNameStyle = {
  fontWeight: "bold" as const,
  fontSize: "15px",
  color: "#1d1d1f",
} as const;

const sigTitleStyle = {
  fontSize: "12px",
  color: mutedText,
  paddingTop: "2px",
} as const;

const sigCompanyName = {
  fontSize: "11px",
  fontWeight: "bold" as const,
  color: sigGreen,
  letterSpacing: "1.5px",
  padding: "2px 0 8px 0",
} as const;

const sigRows = {
  borderCollapse: "collapse" as const,
  fontSize: "12px",
} as const;

const sigLabel = {
  color: "#6e6e73",
  padding: "1px 12px 1px 0",
} as const;

const sigValue = {
  padding: "1px 0",
} as const;

const sigLink = {
  color: "#1d1d1f",
  textDecoration: "none" as const,
} as const;

const sigMailLink = {
  color: sigGreen,
  textDecoration: "none" as const,
} as const;

const sigCvr = {
  fontSize: "10px",
  color: "#8e8e93",
  paddingTop: "6px",
} as const;

// Plain text link only: no stars, ratings or Trustpilot colours (Trustpilot brand guidelines).
const sigTrustpilotLink = {
  color: sigGreen,
  fontSize: "12px",
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
