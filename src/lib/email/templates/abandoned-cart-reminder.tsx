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
  Img,
} from "@react-email/components";
import { BRAND } from "@/lib/email/brand";

export interface AbandonedCartReminderProps {
  customerName: string;
  items: Array<{ title: string; price: number; image?: string }>;
  total: number;
  recoveryUrl: string;
  discountCode: string;
  discountPercent: number;
  discountValidDays: number;
}

export const subject = "Vi har 5% rabat klar til dig — fuldfør dit køb";
export const from = "info@phonespot.dk";

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

function formatDKK(oere: number): string {
  return (
    (oere / 100).toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " kr."
  );
}

export default function AbandonedCartReminderEmail({
  customerName,
  items,
  total,
  recoveryUrl,
  discountCode,
  discountPercent,
  discountValidDays,
}: AbandonedCartReminderProps) {
  const firstName = customerName.split(" ")[0] ?? customerName;

  return (
    <Html lang="da">
      <Head />
      <Body
        style={{
          margin: "0",
          padding: "0",
          backgroundColor: BRAND.warmWhite,
          fontFamily: FONT,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "32px auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* ── Header ── */}
          <Section
            style={{
              backgroundColor: BRAND.green,
              padding: "28px 40px",
              textAlign: "center" as const,
            }}
          >
            <Img
              src={BRAND.logoWhite}
              alt="PhoneSpot"
              height={34}
              style={{ height: "34px", display: "inline-block" }}
            />
          </Section>

          {/* ── Discount hero ── */}
          <Section style={{ padding: "24px 32px 0" }}>
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                backgroundColor: BRAND.green,
                borderRadius: "12px",
                border: `2px dashed ${BRAND.greenLight}`,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "18px 22px", textAlign: "center" }}>
                    <Text
                      style={{
                        margin: "0 0 4px",
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.85)",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontFamily: FONT,
                      }}
                    >
                      Din rabatkode
                    </Text>
                    <Text
                      style={{
                        margin: "0 0 6px",
                        fontSize: "28px",
                        fontWeight: 800,
                        color: "#ffffff",
                        letterSpacing: "2px",
                        fontFamily: FONT,
                      }}
                    >
                      {discountCode}
                    </Text>
                    <Text
                      style={{
                        margin: "0",
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.9)",
                        fontFamily: FONT,
                      }}
                    >
                      {discountPercent}% rabat · gyldig i {discountValidDays} dage · kun til dig
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* ── Greeting ── */}
          <Section style={{ padding: "24px 32px 0" }}>
            <Text
              style={{
                margin: "0",
                fontSize: "22px",
                fontWeight: 800,
                color: BRAND.charcoal,
                fontFamily: FONT,
              }}
            >
              Hej {firstName}, vi har stadig dine varer
            </Text>
            <Text
              style={{
                margin: "10px 0 0",
                fontSize: "15px",
                color: "#555555",
                lineHeight: "1.6",
                fontFamily: FONT,
              }}
            >
              Vi har reserveret din kurv lidt endnu — og som tak for ventetiden er her en lille gave.
              Brug koden ovenfor ved kassen for at få {discountPercent}% rabat på dit køb.
            </Text>
          </Section>

          {/* ── Item list ── */}
          <Section style={{ padding: "20px 32px 0" }}>
            {items.map((item, idx) => (
              <table
                key={idx}
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{
                  borderBottom: `1px solid ${BRAND.sand}`,
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: "12px 0" }}>
                      <Text
                        style={{
                          margin: "0",
                          color: BRAND.charcoal,
                          fontSize: "14px",
                          fontFamily: FONT,
                        }}
                      >
                        {item.title}
                      </Text>
                    </td>
                    <td style={{ padding: "12px 0", textAlign: "right" }}>
                      <Text
                        style={{
                          margin: "0",
                          color: BRAND.charcoal,
                          fontSize: "14px",
                          fontWeight: 600,
                          fontFamily: FONT,
                        }}
                      >
                        {formatDKK(item.price)}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}

            {/* Total row */}
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ padding: "14px 0" }}>
                    <Text
                      style={{
                        margin: "0",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: BRAND.charcoal,
                        fontFamily: FONT,
                      }}
                    >
                      I alt
                    </Text>
                  </td>
                  <td style={{ padding: "14px 0", textAlign: "right" }}>
                    <Text
                      style={{
                        margin: "0",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: BRAND.charcoal,
                        fontFamily: FONT,
                      }}
                    >
                      {formatDKK(total)}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* ── CTA ── */}
          <Section
            style={{
              padding: "12px 32px 32px",
              textAlign: "center" as const,
            }}
          >
            <Button
              href={recoveryUrl}
              style={{
                backgroundColor: BRAND.green,
                color: "#ffffff",
                padding: "14px 36px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-block",
                fontFamily: FONT,
              }}
            >
              Fuldfør dit køb
            </Button>
          </Section>

          <Hr style={{ borderColor: BRAND.sand, margin: "0" }} />

          {/* ── Footer ── */}
          <Section style={{ padding: "20px 32px 28px" }}>
            <Text
              style={{
                margin: "0",
                fontSize: "12px",
                color: "#888888",
                lineHeight: "1.6",
                fontFamily: FONT,
              }}
            >
              Skriv koden <strong>{discountCode}</strong> ind ved kassen for at få {discountPercent}%
              rabat. Spørgsmål? Skriv til{" "}
              <Link href={`mailto:${BRAND.email}`} style={{ color: BRAND.green }}>
                {BRAND.email}
              </Link>{" "}
              eller ring på{" "}
              <Link href="tel:+4561100048" style={{ color: BRAND.green }}>
                {BRAND.phone}
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
