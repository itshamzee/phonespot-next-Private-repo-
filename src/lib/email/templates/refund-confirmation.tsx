import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface RefundConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  refundAmount: number;
  reason: string;
}

function formatAmount(oerer: number): string {
  const kroner = oerer / 100;
  return kroner.toFixed(2).replace(".", ",") + " kr.";
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
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" }}>
          {/* Green header */}
          <Section style={{ backgroundColor: "#22c55e", padding: "24px 32px" }}>
            <Text style={{ color: "#ffffff", fontSize: "22px", fontWeight: "bold", margin: 0 }}>
              PhoneSpot
            </Text>
            <Text style={{ color: "#dcfce7", fontSize: "14px", margin: "4px 0 0 0" }}>
              Refusion bekræftet
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Text style={{ fontSize: "16px", color: "#111827", marginTop: 0 }}>
              Hej {customerName},
            </Text>
            <Text style={{ fontSize: "16px", color: "#111827" }}>
              Vi har refunderet <strong>{formatAmount(refundAmount)}</strong> for ordre{" "}
              <strong>{orderNumber}</strong>.
            </Text>
            <Text style={{ fontSize: "15px", color: "#374151" }}>
              Beløbet vil normalt være på din konto inden for 3-5 hverdage, afhængigt af din bank eller kortudsteder.
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

            <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 4px 0" }}>
              <strong>Årsag til refusion:</strong>
            </Text>
            <Text style={{ fontSize: "14px", color: "#374151", marginTop: 0 }}>
              {reason}
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

            <Text style={{ fontSize: "14px", color: "#6b7280" }}>
              Har du spørgsmål? Kontakt os på{" "}
              <a href="mailto:info@phonespot.dk" style={{ color: "#22c55e" }}>
                info@phonespot.dk
              </a>{" "}
              eller ring på <strong>71 99 48 48</strong>.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: "#f3f4f6", padding: "16px 32px" }}>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: 0, textAlign: "center" as const }}>
              PhoneSpot | CVR: 38688766 | info@phonespot.dk | 71 99 48 48
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
