import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import {
  INSURANCE,
  STORSTROM_COVERAGE,
  isInStorstromCoverage,
} from "@/lib/insurance-config";

const resend = new Resend(process.env.RESEND_API_KEY);

// Where insurance leads are sent. Kept separate from info@ so leads land in the
// right inbox (info@ is also used for order/system mail).
const LEAD_EMAIL = "haj@phonespot.dk";

type RawBody = {
  navn?: unknown;
  kontakt?: unknown;
  postnummer?: unknown;
  source?: unknown;
};

export type InsuranceLead = {
  navn: string;
  kontakt: string;
  postnummer: string;
  isEmail: boolean;
  sourcePage: "product" | "cart";
};

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhone(v: string): boolean {
  return v.replace(/[^\d]/g, "").length >= 8;
}

/**
 * Server-side validation. Postnummer is required (4 digits); kontakt must be a
 * plausible phone or e-mail so we can actually reach the lead.
 */
export function validateInsuranceLead(
  body: RawBody,
): { ok: true; data: InsuranceLead } | { ok: false; error: string } {
  const navn = typeof body.navn === "string" ? body.navn.trim() : "";
  const kontakt = typeof body.kontakt === "string" ? body.kontakt.trim() : "";
  const postnummer =
    typeof body.postnummer === "string" ? body.postnummer.trim() : "";
  const sourcePage = body.source === "cart" ? "cart" : "product";

  if (!/^\d{4}$/.test(postnummer)) {
    return { ok: false, error: "Angiv et gyldigt postnummer (4 cifre)." };
  }
  const email = isEmail(kontakt);
  if (!email && !isPhone(kontakt)) {
    return { ok: false, error: "Angiv et telefonnummer eller en e-mail." };
  }

  return {
    ok: true,
    data: { navn, kontakt, postnummer, isEmail: email, sourcePage },
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RawBody;

  const result = validateInsuranceLead(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { navn, kontakt, postnummer, isEmail: kontaktIsEmail, sourcePage } =
    result.data;

  const sourceLabel = sourcePage === "cart" ? "kurven" : "produktsiden";
  const inCoverage = isInStorstromCoverage(postnummer);
  const coverageLine = inCoverage
    ? `Dækning (${STORSTROM_COVERAGE.min}-${STORSTROM_COVERAGE.max}): JA — ring til kunden og opret tilbud via Storstrøm-portalen.`
    : `Dækning (${STORSTROM_COVERAGE.min}-${STORSTROM_COVERAGE.max}): NEJ — udenfor Storstrøms område. Ring gerne til kunden, men afvent løsning (Storstrøm vender tilbage aug/sept).`;
  const message = [
    `Interesse i elektronikforsikring (via ${sourceLabel}).`,
    `Kontakt: ${kontakt}`,
    `Postnummer: ${postnummer}`,
    coverageLine,
  ].join("\n");

  // Reuse the existing contact_inquiries table. email is NOT NULL, so store the
  // e-mail there when given and keep the phone in the phone column otherwise.
  // TODO: move insurance leads to a dedicated insurance_leads table if volume
  // grows and we want structured fields (device, chosen coverage, etc.).
  const supabase = createServerClient();
  await supabase.from("contact_inquiries").insert({
    name: navn || "Forsikringslead",
    email: kontaktIsEmail ? kontakt : "",
    phone: kontaktIsEmail ? null : kontakt,
    subject: "Elektronikforsikring — interesse",
    message,
    source: INSURANCE.leadSource,
    metadata: {
      postnummer,
      kontakt,
      lead_source_page: sourcePage,
      created_via: "insurance-lead-form",
      in_coverage: inCoverage,
      coverage_area: `${STORSTROM_COVERAGE.min}-${STORSTROM_COVERAGE.max}`,
    },
  });

  try {
    await resend.emails.send({
      from: "PhoneSpot Forsikring <noreply@phonespot.dk>",
      to: LEAD_EMAIL,
      ...(kontaktIsEmail ? { replyTo: kontakt } : {}),
      subject: `Ny forsikringslead — ${postnummer} ${inCoverage ? "(dækket)" : "(udenfor område)"}`,
      text: [
        "Ny interesse i elektronikforsikring.",
        "",
        `Navn: ${navn || "(ikke oplyst)"}`,
        `Kontakt: ${kontakt}`,
        `Postnummer: ${postnummer}`,
        `Kilde: ${sourceLabel}`,
        "",
        coverageLine,
      ].join("\n"),
    });
  } catch {
    // Lead is already persisted; email failure should not fail the request.
    console.warn("[insurance-lead] notification email failed");
  }

  return NextResponse.json({ success: true });
}
