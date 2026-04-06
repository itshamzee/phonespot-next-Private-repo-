import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Button,
  Hr,
  Row,
  Column,
  Link,
} from "@react-email/components";
import { BRAND } from "@/lib/email/brand";

export interface AbandonedCartEmailProps {
  customerName: string;
  items: Array<{ title: string; price: number; image?: string }>; // price in øre
  total: number; // øre
  recoveryUrl: string;
}

function formatDKK(oere: number): string {
  return (
    (oere / 100).toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " kr."
  );
}

export const subject = "Du glemte noget i din kurv";
export const from = "ordre@phonespot.dk";

const font    = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const green   = BRAND.green;
const greenL  = BRAND.greenLight;
const charcoal = BRAND.charcoal;
const warmWhite = BRAND.warmWhite;
const sand    = BRAND.sand;

export default function AbandonedCartEmail({
  customerName,
  items,
  total,
  recoveryUrl,
}: AbandonedCartEmailProps) {
  return (
    <Html lang="da">
      <Head />
      <Body style={{
        margin:          "0",
        padding:         "0",
        backgroundColor: warmWhite,
        fontFamily:      font,
      }}>

        <Container style={{
          maxWidth:        "600px",
          margin:          "0 auto",
          backgroundColor: "#ffffff",
          borderRadius:    "12px",
          overflow:        "hidden",
        }}>

          {/* ── Header ── */}
          <Section style={{
            backgroundColor: green,
            padding:         "28px 40px",
            textAlign:       "center" as const,
          }}>
            <Img
              src={BRAND.logoWhite}
              alt="PhoneSpot"
              height={34}
              style={{ height: "34px", display: "inline-block" }}
            />
          </Section>

          {/* ── Urgency stripe ── */}
          <Section style={{
            backgroundColor: "#fff8ed",
            padding:         "12px 40px",
            borderBottom:    `1px solid #f0ddb8`,
            textAlign:       "center" as const,
          }}>
            <Text style={{
              margin:     "0",
              fontSize:   "13px",
              color:      "#a05a00",
              fontWeight: "700" as const,
              fontFamily: font,
            }}>
              &#9200;&nbsp; Dine varer er reserveret i 24 timer
            </Text>
          </Section>

          {/* ── Body ── */}
          <Section style={{ padding: "36px 40px 0" }}>

            <Text style={{
              margin:     "0 0 4px",
              fontSize:   "13px",
              color:      "#888",
              fontFamily: font,
            }}>
              Hej {customerName},
            </Text>
            <Text style={{
              margin:        "0 0 8px",
              fontSize:      "26px",
              fontWeight:    "800" as const,
              color:         charcoal,
              letterSpacing: "-0.4px",
              lineHeight:    "1.2",
              fontFamily:    font,
            }}>
              Du glemte noget!
            </Text>
            <Text style={{
              margin:     "0 0 28px",
              fontSize:   "15px",
              color:      "#555",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              Du har stadig varer i din indkøbskurv. Vi holder dem til dig &mdash;
              men kun i en begrænset periode.
            </Text>

            {/* ── Items table ── */}
            <Section style={{
              border:       `1px solid ${sand}`,
              borderRadius: "10px",
              overflow:     "hidden",
              margin:       "0 0 24px",
            }}>

              {/* Table header */}
              <Row style={{ backgroundColor: warmWhite, borderBottom: `1px solid ${sand}` }}>
                <Column style={{ padding: "10px 16px", width: "60%" }}>
                  <Text style={{
                    margin:        "0",
                    fontSize:      "11px",
                    fontWeight:    "700" as const,
                    textTransform: "uppercase" as const,
                    letterSpacing: "1px",
                    color:         "#999",
                    fontFamily:    font,
                  }}>Produkt</Text>
                </Column>
                <Column style={{ padding: "10px 16px 10px 0", width: "40%", textAlign: "right" as const }}>
                  <Text style={{
                    margin:        "0",
                    fontSize:      "11px",
                    fontWeight:    "700" as const,
                    textTransform: "uppercase" as const,
                    letterSpacing: "1px",
                    color:         "#999",
                    fontFamily:    font,
                  }}>Pris</Text>
                </Column>
              </Row>

              {/* Item rows */}
              {items.map((item, index) => (
                <Row
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : warmWhite,
                    borderBottom: index < items.length - 1 ? `1px solid ${sand}` : "none",
                  }}
                >
                  {/* Thumbnail (conditional) */}
                  {item.image ? (
                    <Column style={{ width: "72px", padding: "12px 0 12px 16px", verticalAlign: "middle" as const }}>
                      <Img
                        src={item.image}
                        alt={item.title}
                        width={52}
                        height={52}
                        style={{
                          width:        "52px",
                          height:       "52px",
                          objectFit:    "cover" as const,
                          borderRadius: "6px",
                          border:       `1px solid ${sand}`,
                          display:      "block",
                        }}
                      />
                    </Column>
                  ) : null}

                  <Column style={{
                    padding:        item.image ? "12px 0 12px 12px" : "12px 0 12px 16px",
                    verticalAlign:  "middle" as const,
                  }}>
                    <Text style={{
                      margin:     "0",
                      fontSize:   "14px",
                      color:      charcoal,
                      lineHeight: "1.4",
                      fontFamily: font,
                    }}>
                      {item.title}
                    </Text>
                  </Column>

                  <Column style={{
                    padding:       "12px 16px 12px 0",
                    verticalAlign: "middle" as const,
                    textAlign:     "right" as const,
                    width:         "110px",
                  }}>
                    <Text style={{
                      margin:      "0",
                      fontSize:    "14px",
                      fontWeight:  "600" as const,
                      color:       charcoal,
                      whiteSpace:  "nowrap" as const,
                      fontFamily:  font,
                    }}>
                      {formatDKK(item.price)}
                    </Text>
                  </Column>
                </Row>
              ))}

              {/* Total row */}
              <Row style={{ backgroundColor: warmWhite, borderTop: `2px solid ${sand}` }}>
                <Column style={{ padding: "14px 0 14px 16px" }}>
                  <Text style={{
                    margin:     "0",
                    fontSize:   "15px",
                    fontWeight: "700" as const,
                    color:      charcoal,
                    fontFamily: font,
                  }}>
                    Total
                  </Text>
                </Column>
                <Column style={{ padding: "14px 16px 14px 0", textAlign: "right" as const, width: "110px" }}>
                  <Text style={{
                    margin:     "0",
                    fontSize:   "16px",
                    fontWeight: "800" as const,
                    color:      green,
                    fontFamily: font,
                    whiteSpace: "nowrap" as const,
                  }}>
                    {formatDKK(total)}
                  </Text>
                </Column>
              </Row>

            </Section>

            {/* ── CTA ── */}
            <Section style={{ textAlign: "center" as const, margin: "0 0 10px" }}>
              <Button
                href={recoveryUrl}
                style={{
                  backgroundColor: green,
                  color:           "#ffffff",
                  padding:         "16px 48px",
                  borderRadius:    "8px",
                  fontSize:        "16px",
                  fontWeight:      "700" as const,
                  textDecoration:  "none",
                  display:         "inline-block",
                  fontFamily:      font,
                  letterSpacing:   "0.1px",
                }}
              >
                Gå til din kurv
              </Button>
            </Section>

            <Text style={{
              fontSize:   "12px",
              color:      "#aaa",
              textAlign:  "center" as const,
              margin:     "0 0 28px",
              fontFamily: font,
            }}>
              Reserveret i 24 timer &mdash; først til mølle
            </Text>

            <Hr style={{ borderTop: `1px solid ${sand}`, margin: "0 0 24px" }} />

            {/* ── Trust bullets ── */}
            <Text style={{
              fontSize:   "13px",
              color:      "#555",
              margin:     "0 0 8px",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              Hos PhoneSpot får du:
            </Text>
            {BRAND.usps.map((usp, i) => (
              <Text key={i} style={{
                fontSize:   "13px",
                color:      "#444",
                margin:     "0 0 4px",
                fontFamily: font,
              }}>
                <span style={{ color: greenL, fontWeight: "700", marginRight: "6px" }}>&#10003;</span>
                {usp}
              </Text>
            ))}

            <Hr style={{ borderTop: `1px solid ${sand}`, margin: "24px 0" }} />

            <Text style={{
              fontSize:   "14px",
              color:      "#555",
              margin:     "0 0 28px",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              Har du spørgsmål? Ring til os på{" "}
              <Link href="tel:+4561100048" style={{ color: charcoal, fontWeight: "700" as const, textDecoration: "none" }}>
                {BRAND.phone}
              </Link>
              {" "}eller skriv til{" "}
              <Link href={`mailto:${BRAND.email}`} style={{ color: greenL, textDecoration: "underline" }}>
                {BRAND.email}
              </Link>
              .
            </Text>

          </Section>

          {/* ── USP bar ── */}
          <Section style={{
            borderTop:       `1px solid ${sand}`,
            backgroundColor: warmWhite,
            padding:         "18px 40px",
          }}>
            <Row>
              {BRAND.usps.map((usp, i) => (
                <Column key={i} style={{ textAlign: "center" as const, padding: "0 6px" }}>
                  <Text style={{
                    fontSize:   "11px",
                    color:      charcoal,
                    margin:     "0",
                    fontFamily: font,
                    whiteSpace: "nowrap" as const,
                  }}>
                    <span style={{ color: greenL, fontWeight: "700", marginRight: "3px" }}>&#10003;</span>
                    {usp}
                  </Text>
                </Column>
              ))}
            </Row>
          </Section>

          {/* ── Footer ── */}
          <Section style={{
            backgroundColor: "#f5f5f5",
            padding:         "20px 40px",
            textAlign:       "center" as const,
          }}>
            <Text style={{
              margin:     "0 0 4px",
              fontSize:   "13px",
              fontWeight: "600" as const,
              color:      charcoal,
              fontFamily: font,
            }}>
              {BRAND.store.name} &middot; {BRAND.store.address}
            </Text>
            <Text style={{
              margin:     "0 0 4px",
              fontSize:   "12px",
              color:      "#888",
              fontFamily: font,
            }}>
              {BRAND.store.hours}
            </Text>
            <Text style={{
              margin:     "0 0 10px",
              fontSize:   "13px",
              color:      "#888",
              fontFamily: font,
            }}>
              <Link href="tel:+4561100048" style={{ color: charcoal, textDecoration: "none", fontWeight: "600" as const }}>
                {BRAND.phone}
              </Link>
              &nbsp;&middot;&nbsp;
              <Link href={`mailto:${BRAND.email}`} style={{ color: greenL, textDecoration: "none" }}>
                {BRAND.email}
              </Link>
            </Text>
            <Row style={{ marginBottom: "10px" }}>
              <Column style={{ textAlign: "center" as const }}>
                <Link href={BRAND.facebook} style={{
                  backgroundColor: "#1877F2",
                  color:           "#ffffff",
                  padding:         "5px 12px",
                  borderRadius:    "4px",
                  fontSize:        "12px",
                  fontWeight:      "600" as const,
                  textDecoration:  "none",
                  marginRight:     "8px",
                  fontFamily:      font,
                }}>
                  f&nbsp;Facebook
                </Link>
                <Link href={BRAND.trustpilot} style={{
                  backgroundColor: "#00B67A",
                  color:           "#ffffff",
                  padding:         "5px 12px",
                  borderRadius:    "4px",
                  fontSize:        "12px",
                  fontWeight:      "600" as const,
                  textDecoration:  "none",
                  fontFamily:      font,
                }}>
                  &#9733;&nbsp;Trustpilot
                </Link>
              </Column>
            </Row>
            <Text style={{
              margin:     "0",
              fontSize:   "11px",
              color:      "#bbb",
              fontFamily: font,
            }}>
              PhoneSpot &middot; CVR: {BRAND.cvr} &middot; Denne e-mail er sendt fordi du lagde varer i kurven på phonespot.dk.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
