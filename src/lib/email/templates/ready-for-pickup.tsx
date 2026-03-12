import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface ReadyForPickupEmailProps {
  orderNumber: string;
  customerName: string;
  locationName: string;
  locationAddress: string;
  locationPhone: string;
}

export default function ReadyForPickupEmail({
  orderNumber,
  customerName,
  locationName,
  locationAddress,
  locationPhone,
}: ReadyForPickupEmailProps) {
  return (
    <Html lang="da">
      <Head />
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" }}>
          {/* Green header */}
          <Section style={{ backgroundColor: "#22c55e", padding: "24px 32px" }}>
            <Text style={{ color: "#ffffff", fontSize: "22px", fontWeight: "bold", margin: 0 }}>
              PhoneSpot
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Text style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", marginTop: 0 }}>
              Din ordre er klar til afhentning!
            </Text>
            <Text style={{ fontSize: "16px", color: "#374151" }}>
              Hej {customerName}, din ordre <strong>{orderNumber}</strong> er klar til afhentning!
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

            <Text style={{ fontSize: "15px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>
              Afhentningssted
            </Text>
            <Text style={{ fontSize: "15px", color: "#374151", margin: "4px 0" }}>
              {locationName}
            </Text>
            <Text style={{ fontSize: "15px", color: "#374151", margin: "4px 0" }}>
              {locationAddress}
            </Text>
            <Text style={{ fontSize: "15px", color: "#374151", margin: "4px 0" }}>
              Tlf: {locationPhone}
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

            <Text style={{ fontSize: "14px", color: "#6b7280" }}>
              Se vores åbningstider på{" "}
              <a href="https://phonespot.dk" style={{ color: "#22c55e" }}>
                phonespot.dk
              </a>
            </Text>
            <Text style={{ fontSize: "14px", color: "#6b7280" }}>
              Medbring gyldig billedlegitimation.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: "#f9fafb", padding: "16px 32px", borderTop: "1px solid #e5e7eb" }}>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              PhoneSpot | CVR: 44138827 | info@phonespot.dk | 71 99 48 48
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
