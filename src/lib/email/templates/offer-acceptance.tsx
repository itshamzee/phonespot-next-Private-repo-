// src/lib/email/templates/offer-acceptance.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
  Button,
  Link,
  Row,
  Column,
} from "@react-email/components";
import type { StaffProfile, CompanySettings, DeviceGuideType } from "@/lib/supabase/email-types";
import { BRAND } from "@/lib/email/brand";

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

// ── Shared style tokens ────────────────────────────────────────────────────────
const green      = BRAND.green;
const greenLight = BRAND.greenLight;
const charcoal   = BRAND.charcoal;
const warmWhite  = BRAND.warmWhite;
const sand       = BRAND.sand;

const font = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const sectionTitle = {
  fontSize:   "15px",
  fontWeight: "700" as const,
  color:      charcoal,
  margin:     "24px 0 10px 0",
  fontFamily: font,
} as const;

const stepStyle = {
  fontSize:   "14px",
  color:      "#444",
  margin:     "0 0 6px 0",
  lineHeight: "1.6",
  paddingLeft:"16px",
  fontFamily: font,
} as const;

const uspCheckStyle = {
  fontSize:   "12px",
  color:      charcoal,
  margin:     "0",
  fontFamily: font,
  whiteSpace: "nowrap" as const,
} as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function OfferAcceptanceEmail(props: OfferAcceptanceEmailProps) {
  const {
    customerName,
    brand: deviceBrand,
    model,
    storage,
    offerAmountKr,
    trackingNumber,
    trackingUrl,
    labelDownloadUrl,
    deviceGuide,
  } = props;

  const deviceName = [deviceBrand, model, storage].filter(Boolean).join(" ");

  return (
    <Html lang="da">
      <Head />
      <Body style={{
        margin: "0",
        padding: "0",
        backgroundColor: warmWhite,
        fontFamily: font,
      }}>
        {/* Hidden preview text */}
        <Text style={{ display: "none", maxHeight: "0", overflow: "hidden", fontSize: "1px", color: warmWhite } as unknown as React.CSSProperties}>
          {`Dit tilbud p\u00e5 ${deviceName} er accepteret \u2014 her er n\u00e6ste skridt`}
        </Text>

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

          {/* ── Confirmation banner ── */}
          <Section style={{
            backgroundColor: "#f0f7f3",
            padding:         "18px 40px",
            borderBottom:    `1px solid ${sand}`,
            textAlign:       "center" as const,
          }}>
            <Text style={{
              margin:     "0",
              fontSize:   "15px",
              color:      green,
              fontWeight: "700" as const,
              fontFamily: font,
            }}>
              &#10003;&nbsp; Tilbud accepteret &mdash; tak skal du have!
            </Text>
          </Section>

          {/* ── Body ── */}
          <Section style={{ padding: "36px 40px 28px" }}>

            <Text style={{
              fontSize:   "15px",
              color:      "#333",
              margin:     "0 0 6px 0",
              fontFamily: font,
            }}>
              Hej {customerName},
            </Text>
            <Text style={{
              fontSize:   "15px",
              color:      "#555",
              margin:     "0 0 24px 0",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              Tak for at du har accepteret vores tilbud. Nedenfor finder du en
              opsummering samt vejledning til de n&aelig;ste skridt.
            </Text>

            {/* Device + price box */}
            <Section style={{
              backgroundColor: warmWhite,
              border:          `1px solid ${sand}`,
              borderRadius:    "10px",
              margin:          "0 0 28px 0",
            }}>
              <Row>
                <Column style={{ padding: "20px 24px 20px 24px", verticalAlign: "top" as const }}>
                  <Text style={{
                    margin:          "0 0 2px 0",
                    fontSize:        "11px",
                    fontWeight:      "700" as const,
                    textTransform:   "uppercase" as const,
                    letterSpacing:   "1.2px",
                    color:           greenLight,
                    fontFamily:      font,
                  }}>Enhed</Text>
                  <Text style={{
                    margin:     "0 0 14px 0",
                    fontSize:   "17px",
                    fontWeight: "700" as const,
                    color:      charcoal,
                    fontFamily: font,
                  }}>
                    {deviceName}
                  </Text>
                  <Text style={{
                    margin:          "0 0 2px 0",
                    fontSize:        "11px",
                    fontWeight:      "700" as const,
                    textTransform:   "uppercase" as const,
                    letterSpacing:   "1.2px",
                    color:           greenLight,
                    fontFamily:      font,
                  }}>Aftalt pris</Text>
                  <Text style={{
                    margin:     "0",
                    fontSize:   "28px",
                    fontWeight: "800" as const,
                    color:      green,
                    letterSpacing: "-0.5px",
                    fontFamily: font,
                  }}>
                    {offerAmountKr}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* ── Shipping label ── */}
            {labelDownloadUrl ? (
              <>
                <Text style={sectionTitle}>Forsendelsesm&aelig;rkat</Text>
                <Text style={{
                  fontSize:   "14px",
                  color:      "#555",
                  margin:     "0 0 14px 0",
                  lineHeight: "1.6",
                  fontFamily: font,
                }}>
                  Din forsendelsesm&aelig;rkat er klar. Print den og s&aelig;t
                  den p&aring; ydersiden af pakken.
                </Text>
                <Button
                  href={labelDownloadUrl}
                  style={{
                    backgroundColor: green,
                    color:           "#ffffff",
                    padding:         "13px 28px",
                    borderRadius:    "7px",
                    fontWeight:      "700" as const,
                    fontSize:        "14px",
                    textDecoration:  "none",
                    display:         "inline-block",
                    margin:          "0 0 14px 0",
                    fontFamily:      font,
                  }}
                >
                  Download forsendelsesm&aelig;rkat (PDF)
                </Button>
                {trackingNumber && (
                  <Text style={{
                    fontSize:   "13px",
                    color:      "#666",
                    margin:     "0 0 20px 0",
                    fontFamily: font,
                  }}>
                    Trackingnummer:{" "}
                    {trackingUrl ? (
                      <Link href={trackingUrl} style={{ color: green }}>
                        {trackingNumber}
                      </Link>
                    ) : (
                      trackingNumber
                    )}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={sectionTitle}>Forsendelsesm&aelig;rkat</Text>
                <Text style={{
                  fontSize:   "14px",
                  color:      "#555",
                  margin:     "0 0 20px 0",
                  lineHeight: "1.6",
                  fontFamily: font,
                }}>
                  Vi sender dig en forsendelsesm&aelig;rkat snarest muligt &mdash;
                  du modtager den p&aring; e-mail.
                </Text>
              </>
            )}

            <Hr style={{ borderTop: `1px solid ${sand}`, margin: "20px 0" }} />

            {/* ── Device reset guide ── */}
            <Text style={sectionTitle}>Nulstilling af enhed</Text>
            <Text style={{
              fontSize:   "14px",
              color:      "#555",
              margin:     "0 0 16px 0",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              F&oslash;r du sender enheden skal den nulstilles til fabriksindstillinger
              og alle konti skal frakobles. F&oslash;lg trinene nedenfor:
            </Text>

            {(deviceGuide === "apple" || deviceGuide === "generic") && (
              <Section style={{
                backgroundColor: warmWhite,
                border:          `1px solid ${sand}`,
                borderRadius:    "8px",
                padding:         "16px 20px",
                margin:          "0 0 12px 0",
              }}>
                <Text style={{
                  fontSize:   "13px",
                  fontWeight: "700" as const,
                  color:      charcoal,
                  margin:     "0 0 8px 0",
                  fontFamily: font,
                }}>
                  Apple &mdash; iPhone / iPad / Mac
                </Text>
                <Text style={stepStyle}>1. Indstillinger &rarr; dit navn &rarr; Find My &rarr; Sl&aring; Find My fra</Text>
                <Text style={stepStyle}>2. Indstillinger &rarr; dit navn &rarr; Log ud (af iCloud)</Text>
                <Text style={{ ...stepStyle, margin: "0" }}>3. Indstillinger &rarr; Generelt &rarr; Overf&oslash;r eller Nulstil &rarr; Slet alt indhold og indstillinger</Text>
              </Section>
            )}

            {(deviceGuide === "android" || deviceGuide === "generic") && (
              <Section style={{
                backgroundColor: warmWhite,
                border:          `1px solid ${sand}`,
                borderRadius:    "8px",
                padding:         "16px 20px",
                margin:          "0 0 12px 0",
              }}>
                <Text style={{
                  fontSize:   "13px",
                  fontWeight: "700" as const,
                  color:      charcoal,
                  margin:     "0 0 8px 0",
                  fontFamily: font,
                }}>
                  Android &mdash; Samsung / Huawei / OnePlus m.fl.
                </Text>
                <Text style={stepStyle}>1. Indstillinger &rarr; Konti &rarr; Fjern din Google-konto</Text>
                <Text style={{ ...stepStyle, margin: "0" }}>2. Indstillinger &rarr; Generel styring &rarr; Nulstil &rarr; Nulstil til fabriksindstillinger</Text>
              </Section>
            )}

            {(deviceGuide === "windows" || deviceGuide === "generic") && (
              <Section style={{
                backgroundColor: warmWhite,
                border:          `1px solid ${sand}`,
                borderRadius:    "8px",
                padding:         "16px 20px",
                margin:          "0 0 20px 0",
              }}>
                <Text style={{
                  fontSize:   "13px",
                  fontWeight: "700" as const,
                  color:      charcoal,
                  margin:     "0 0 8px 0",
                  fontFamily: font,
                }}>
                  Windows &mdash; laptop / tablet
                </Text>
                <Text style={stepStyle}>1. Indstillinger &rarr; Konti &rarr; Fjern din Microsoft-konto</Text>
                <Text style={{ ...stepStyle, margin: "0" }}>2. Indstillinger &rarr; System &rarr; Genoprettelse &rarr; Nulstil denne pc &rarr; Fjern alt</Text>
              </Section>
            )}

            <Hr style={{ borderTop: `1px solid ${sand}`, margin: "20px 0" }} />

            {/* ── Packing guide ── */}
            <Text style={sectionTitle}>S&aring;dan pakker du enheden</Text>
            <Text style={stepStyle}>1. Sluk enheden</Text>
            <Text style={stepStyle}>2. Fjern SIM-kort og evt. hukommelseskort</Text>
            <Text style={stepStyle}>3. Pak enheden i bobleplast eller avisspapir</Text>
            <Text style={stepStyle}>4. Brug den originale &aelig;ske hvis du har den</Text>
            <Text style={stepStyle}>5. Inkludér kun tilbehør hvis det er aftalt</Text>
            <Text style={{ ...stepStyle, margin: "0 0 20px 0" }}>6. S&aelig;t forsendelsesm&aelig;rkaten p&aring; ydersiden af pakken</Text>

            <Hr style={{ borderTop: `1px solid ${sand}`, margin: "20px 0" }} />

            {/* ── Drop-off ── */}
            <Text style={sectionTitle}>Aflevering</Text>
            <Text style={{
              fontSize:   "14px",
              color:      "#555",
              margin:     "0 0 8px 0",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              Aflever pakken i n&aelig;rmeste PostNord pakkeshop eller direkte i
              vores butik i VestsjællandsCentret, Slagelse.
            </Text>
            <Text style={{
              fontSize:   "13px",
              color:      "#777",
              margin:     "0 0 28px 0",
              lineHeight: "1.6",
              fontFamily: font,
            }}>
              Find n&aelig;rmeste pakkeshop:{" "}
              <Link
                href="https://www.postnord.dk/find-lokationer"
                style={{ color: green, textDecoration: "underline" }}
              >
                postnord.dk/find-lokationer
              </Link>
            </Text>

            <Hr style={{ borderTop: `1px solid ${sand}`, margin: "20px 0" }} />

            {/* ── Trustpilot review invitation ── */}
            <Section style={{ textAlign: "center" as const, padding: "16px 0" }}>
              <Text style={{
                fontSize:   "15px",
                color:      "#555",
                lineHeight: "1.6",
                margin:     "0 0 12px",
                fontFamily: font,
              }}>
                Glad for din oplevelse? Vi vil elske at h&oslash;re fra dig!
              </Text>
              <Button
                href="https://dk.trustpilot.com/evaluate/phonespot.dk"
                style={{
                  backgroundColor: "#00b67a",
                  color:           "#ffffff",
                  padding:         "12px 28px",
                  borderRadius:    "8px",
                  fontSize:        "14px",
                  fontWeight:      "bold",
                  textDecoration:  "none",
                }}
              >
                Skriv en anmeldelse p&aring; Trustpilot
              </Button>
            </Section>

          </Section>

          {/* ── USP bar ── */}
          <Section style={{
            borderTop:       `1px solid ${sand}`,
            backgroundColor: warmWhite,
            padding:         "20px 40px",
          }}>
            <Row>
              {BRAND.usps.map((usp, i) => (
                <Column key={i} style={{ textAlign: "center" as const, padding: "0 8px" }}>
                  <Text style={uspCheckStyle}>
                    <span style={{ color: greenLight, fontWeight: "700", marginRight: "4px" }}>&#10003;</span>
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
              <Link href={`tel:+4561100048`} style={{ color: charcoal, textDecoration: "none", fontWeight: "600" as const }}>
                {BRAND.phone}
              </Link>
              &nbsp;&middot;&nbsp;
              <Link href={`mailto:${BRAND.email}`} style={{ color: greenLight, textDecoration: "none" }}>
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
              color:      "#aaa",
              fontFamily: font,
            }}>
              PhoneSpot &middot; CVR: {BRAND.cvr} &middot; Denne e-mail er sendt i forbindelse med din handel hos PhoneSpot.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
