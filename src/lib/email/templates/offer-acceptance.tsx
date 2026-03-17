// src/lib/email/templates/offer-acceptance.tsx
import { Text, Section, Hr, Button, Link } from "@react-email/components";
import BaseLayout from "./base-layout";
import type { StaffProfile, CompanySettings, DeviceGuideType } from "@/lib/supabase/email-types";

interface OfferAcceptanceEmailProps {
  customerName: string;
  brand: string;
  model: string;
  storage: string | null;
  offerAmountKr: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelDownloadUrl?: string | null;
  deviceGuide: DeviceGuideType;
  staffProfile?: StaffProfile | null;
  companySettings?: CompanySettings | null;
}

const green = "#5A8C6F";
const headerBg = "#3A3D38";
const infoBoxBg = "#f5f0eb";
const sectionTitle = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: headerBg,
  margin: "24px 0 12px 0",
} as const;
const stepStyle = {
  fontSize: "14px",
  color: "#333",
  margin: "0 0 6px 0",
  lineHeight: "1.5",
  paddingLeft: "16px",
} as const;

export default function OfferAcceptanceEmail(props: OfferAcceptanceEmailProps) {
  const {
    customerName, brand, model, storage, offerAmountKr,
    trackingNumber, trackingUrl, labelDownloadUrl,
    deviceGuide, staffProfile, companySettings,
  } = props;

  const deviceName = [brand, model, storage].filter(Boolean).join(" ");

  return (
    <BaseLayout
      staffProfile={staffProfile}
      companySettings={companySettings}
      previewText={`Dit tilbud på ${deviceName} er accepteret — her er næste skridt`}
    >
      {/* Confirmation */}
      <Text style={{ fontSize: "15px", color: "#333", margin: "0 0 16px 0" } as const}>
        Hej {customerName},
      </Text>
      <Text style={{ fontSize: "15px", color: "#333", margin: "0 0 16px 0" } as const}>
        Tak for at du har accepteret vores tilbud. Her er en opsummering og vejledning til de næste skridt.
      </Text>

      <Section style={{ backgroundColor: infoBoxBg, padding: "16px", borderRadius: "8px", margin: "0 0 24px 0" } as const}>
        <Text style={{ fontSize: "13px", color: "#666", margin: "0" } as const}>Enhed</Text>
        <Text style={{ fontSize: "16px", fontWeight: "bold" as const, color: headerBg, margin: "4px 0 8px 0" } as const}>
          {deviceName}
        </Text>
        <Text style={{ fontSize: "13px", color: "#666", margin: "0" } as const}>Aftalt pris</Text>
        <Text style={{ fontSize: "20px", fontWeight: "bold" as const, color: green, margin: "4px 0 0 0" } as const}>
          {offerAmountKr}
        </Text>
      </Section>

      {/* Shipping Label */}
      {labelDownloadUrl && (
        <>
          <Text style={sectionTitle}>📦 Forsendelsesmærkat</Text>
          <Text style={stepStyle}>
            Din forsendelsesmærkat er klar. Print den og sæt den på pakken.
          </Text>
          <Button href={labelDownloadUrl} style={{
            backgroundColor: green, color: "#fff", padding: "12px 24px",
            borderRadius: "6px", fontWeight: "bold" as const, fontSize: "14px",
            textDecoration: "none", display: "inline-block", margin: "8px 0 16px 0",
          } as const}>
            Download forsendelsesmærkat (PDF)
          </Button>
          {trackingNumber && (
            <Text style={{ fontSize: "13px", color: "#666", margin: "0 0 16px 0" } as const}>
              Trackingnummer: {trackingUrl ? (
                <Link href={trackingUrl} style={{ color: green }}>{trackingNumber}</Link>
              ) : trackingNumber}
            </Text>
          )}
        </>
      )}

      {!labelDownloadUrl && (
        <>
          <Text style={sectionTitle}>📦 Forsendelsesmærkat</Text>
          <Text style={stepStyle}>
            Vi sender dig en forsendelsesmærkat snarest muligt. Du modtager den på email.
          </Text>
        </>
      )}

      <Hr style={{ borderTop: "1px solid #eee", margin: "16px 0" } as const} />

      {/* Device Reset Guide */}
      <Text style={sectionTitle}>🔄 Nulstilling af enhed</Text>
      <Text style={{ fontSize: "14px", color: "#333", margin: "0 0 12px 0" } as const}>
        Før du sender enheden, skal den nulstilles. Følg disse trin:
      </Text>

      {(deviceGuide === "apple" || deviceGuide === "generic") && (
        <Section style={{ margin: "0 0 16px 0" } as const}>
          <Text style={{ fontSize: "14px", fontWeight: "bold" as const, color: headerBg, margin: "0 0 6px 0" } as const}>
            Apple (iPhone / iPad / Mac):
          </Text>
          <Text style={stepStyle}>1. Gå til Indstillinger → dit navn → Find My → Slå Find My fra</Text>
          <Text style={stepStyle}>2. Gå til Indstillinger → dit navn → Log ud (af iCloud)</Text>
          <Text style={stepStyle}>3. Gå til Indstillinger → Generelt → Overfør eller Nulstil → Slet alt indhold og indstillinger</Text>
        </Section>
      )}

      {(deviceGuide === "android" || deviceGuide === "generic") && (
        <Section style={{ margin: "0 0 16px 0" } as const}>
          <Text style={{ fontSize: "14px", fontWeight: "bold" as const, color: headerBg, margin: "0 0 6px 0" } as const}>
            Android (Samsung / Huawei / OnePlus m.fl.):
          </Text>
          <Text style={stepStyle}>1. Gå til Indstillinger → Konti → Fjern din Google-konto</Text>
          <Text style={stepStyle}>2. Gå til Indstillinger → Generel styring → Nulstil → Nulstil til fabriksindstillinger</Text>
        </Section>
      )}

      {(deviceGuide === "windows" || deviceGuide === "generic") && (
        <Section style={{ margin: "0 0 16px 0" } as const}>
          <Text style={{ fontSize: "14px", fontWeight: "bold" as const, color: headerBg, margin: "0 0 6px 0" } as const}>
            Windows (laptop / tablet):
          </Text>
          <Text style={stepStyle}>1. Gå til Indstillinger → Konti → Fjern din Microsoft-konto</Text>
          <Text style={stepStyle}>2. Gå til Indstillinger → System → Genoprettelse → Nulstil denne pc → Fjern alt</Text>
        </Section>
      )}

      <Hr style={{ borderTop: "1px solid #eee", margin: "16px 0" } as const} />

      {/* Packing Guide */}
      <Text style={sectionTitle}>📋 Sådan pakker du enheden</Text>
      <Text style={stepStyle}>1. Sluk enheden</Text>
      <Text style={stepStyle}>2. Fjern SIM-kort og evt. hukommelseskort</Text>
      <Text style={stepStyle}>3. Pak enheden i bobleplast eller avisspapir</Text>
      <Text style={stepStyle}>4. Brug den originale æske hvis du har den</Text>
      <Text style={stepStyle}>5. Inkludér kun tilbehør hvis det er aftalt</Text>
      <Text style={stepStyle}>6. Sæt forsendelsesmærkaten på ydersiden af pakken</Text>

      <Hr style={{ borderTop: "1px solid #eee", margin: "16px 0" } as const} />

      {/* Drop-off Info */}
      <Text style={sectionTitle}>📍 Aflevering</Text>
      <Text style={{ fontSize: "14px", color: "#333", margin: "0 0 8px 0", lineHeight: "1.5" } as const}>
        Aflever pakken i nærmeste PostNord pakkeshop eller direkte i vores butik.
      </Text>
      <Text style={{ fontSize: "13px", color: "#666", margin: "0", lineHeight: "1.5" } as const}>
        Find nærmeste pakkeshop: <Link href="https://www.postnord.dk/find-lokationer" style={{ color: green }}>postnord.dk/find-lokationer</Link>
      </Text>
    </BaseLayout>
  );
}
