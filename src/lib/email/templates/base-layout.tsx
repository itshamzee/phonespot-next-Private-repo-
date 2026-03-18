// src/lib/email/templates/base-layout.tsx
import {
  Html, Head, Body, Container, Section, Text, Img, Hr, Row, Column, Link,
} from "@react-email/components";
import type { StaffProfile, CompanySettings } from "@/lib/supabase/email-types";

interface BaseLayoutProps {
  children: React.ReactNode;
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
  staffProfile,
  companySettings,
  previewText,
}: BaseLayoutProps) {
  const company = companySettings || {
    company_name: "PhoneSpot",
    address: "VestsjællandsCentret 10",
    postal_city: "4200 Slagelse",
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
          {staffProfile && (
            <Section style={signatureSection}>
              <Hr style={signatureDivider} />
              <Row>
                <Column style={{ width: "60px", verticalAlign: "top" } as const}>
                  {staffProfile.avatar_url ? (
                    <Img
                      src={staffProfile.avatar_url}
                      width="48"
                      height="48"
                      alt={staffProfile.display_name}
                      style={avatarStyle}
                    />
                  ) : (
                    <Text style={initialsStyle}>
                      {staffProfile.display_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </Text>
                  )}
                </Column>
                <Column style={{ verticalAlign: "top" } as const}>
                  <Text style={sigNameStyle}>{staffProfile.display_name}</Text>
                  {staffProfile.title && (
                    <Text style={sigTitleStyle}>{staffProfile.title}</Text>
                  )}
                  <Text style={sigContactStyle}>
                    {staffProfile.phone && <>{staffProfile.phone} | </>}
                    {company.email}
                  </Text>
                  <Text style={sigContactStyle}>{company.website?.replace("https://", "")}</Text>
                </Column>
                <Column style={{ verticalAlign: "top", textAlign: "right", width: "120px" } as const}>
                  <Text style={sigCompanyName}>{company.company_name}</Text>
                  <Text style={sigCompanySub}>Refurbished Electronics</Text>
                </Column>
              </Row>
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

const avatarStyle = {
  borderRadius: "50%",
  objectFit: "cover" as const,
} as const;

const initialsStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: headerBg,
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold" as const,
  lineHeight: "48px",
  textAlign: "center" as const,
  margin: "0",
} as const;

const sigNameStyle = {
  fontWeight: "bold" as const,
  fontSize: "14px",
  color: headerBg,
  margin: "0",
} as const;

const sigTitleStyle = {
  fontSize: "12px",
  color: mutedText,
  margin: "2px 0 0 0",
} as const;

const sigContactStyle = {
  fontSize: "11px",
  color: mutedText,
  margin: "2px 0 0 0",
} as const;

const sigCompanyName = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: headerBg,
  margin: "0",
  letterSpacing: "0.5px",
} as const;

const sigCompanySub = {
  fontSize: "9px",
  color: mutedText,
  margin: "2px 0 0 0",
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
