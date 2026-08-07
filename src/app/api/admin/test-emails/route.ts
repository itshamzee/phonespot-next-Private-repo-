// POST /api/admin/test-emails — send test versions of all email templates
// DELETE THIS FILE after testing

import { NextResponse } from "next/server";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { render } from "@react-email/components";
import ShippingConfirmationEmail from "@/lib/email/templates/shipping-confirmation";
import RefundConfirmationEmail from "@/lib/email/templates/refund-confirmation";
import ReadyForPickupEmail from "@/lib/email/templates/ready-for-pickup";
import { buildOfferEmailHtml } from "@/lib/email/offer-email";
import OfferAcceptanceEmail from "@/lib/email/templates/offer-acceptance";
import { WarrantyCertificateEmail } from "@/lib/email/templates/warranty-certificate";
import AbandonedCartEmail from "@/lib/email/templates/abandoned-cart-email";

export async function POST(request: Request) {
  const { to } = await request.json();
  if (!to) return NextResponse.json({ error: "Missing 'to' email" }, { status: 400 });

  const results: { name: string; ok: boolean; error?: string }[] = [];

  // ── 1. Shipping Confirmation ──
  try {
    const html = await render(
      ShippingConfirmationEmail({
        orderNumber: "TEST-0001",
        customerName: "Test Kunde",
        trackingNumber: "JVGL1234567890",
        trackingUrl: "https://gls-group.eu/DK/da/find-pakke?match=JVGL1234567890",
        shippingMethod: "GLS PakkeShop",
      }),
    );
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Din ordre er afsendt — TEST-0001", html });
    results.push({ name: "Forsendelsesbekræftelse", ok: true });
  } catch (e) {
    results.push({ name: "Forsendelsesbekræftelse", ok: false, error: String(e) });
  }

  // ── 2. Refund Confirmation ──
  try {
    const html = await render(
      RefundConfirmationEmail({
        orderNumber: "TEST-0001",
        customerName: "Test Kunde",
        refundAmount: 384600,
        reason: "Kunden fortrød købet inden for 14 dage",
      }),
    );
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Refundering bekræftet — TEST-0001", html });
    results.push({ name: "Refunderingsbekræftelse", ok: true });
  } catch (e) {
    results.push({ name: "Refunderingsbekræftelse", ok: false, error: String(e) });
  }

  // ── 3. Ready for Pickup ──
  try {
    const html = await render(
      ReadyForPickupEmail({
        orderNumber: "TEST-0001",
        customerName: "Test Kunde",
        locationName: "Slagelse",
        locationAddress: "VestsjællandsCentret 10, 4200 Slagelse",
      }),
    );
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Din ordre er klar til afhentning — TEST-0001", html });
    results.push({ name: "Klar til afhentning", ok: true });
  } catch (e) {
    results.push({ name: "Klar til afhentning", ok: false, error: String(e) });
  }

  // ── 4. Trade-in Offer (Opkøb tilbud) ──
  try {
    const html = buildOfferEmailHtml({
      customerName: "Test Kunde",
      deviceType: "smartphone",
      brand: "Apple",
      model: "iPhone 13 Pro",
      storage: "256GB",
      conditionSummary: "God stand, let ridset bagside, batteri 87%",
      offerAmountKr: "4.500,00 kr.",
      acceptUrl: "https://phonespot.dk/saelg-din-enhed/accepter?token=test123",
      rejectUrl: "https://phonespot.dk/saelg-din-enhed/afvis?token=test123",
    });
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Dit tilbud fra PhoneSpot — 4.500 kr. for din iPhone 13 Pro", html });
    results.push({ name: "Opkøb-tilbud", ok: true });
  } catch (e) {
    results.push({ name: "Opkøb-tilbud", ok: false, error: String(e) });
  }

  // ── 5. Trade-in Accepted (Opkøb accepteret) ──
  try {
    const html = await render(
      OfferAcceptanceEmail({
        customerName: "Test Kunde",
        brand: "Apple",
        model: "iPhone 13 Pro",
        storage: "256GB",
        offerAmountKr: "4.500,00 kr.",
        trackingNumber: "00370726401234567890",
        trackingUrl: "https://tracking.postnord.com/da/?id=00370726401234567890",
        labelDownloadUrl: "https://phonespot.dk/api/trade-in/labels/test123.pdf",
        deviceGuide: "apple",
      }),
    );
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Tilbud accepteret — send din iPhone 13 Pro", html });
    results.push({ name: "Opkøb-accepteret", ok: true });
  } catch (e) {
    results.push({ name: "Opkøb-accepteret", ok: false, error: String(e) });
  }

  // ── 6. Warranty Certificate (Garantibevis) ──
  try {
    const html = await render(
      WarrantyCertificateEmail({
        customerName: "Test Kunde",
        guaranteeNumber: "PS-GAR-2026-00001",
        deviceModel: "Apple iPhone 13 Pro 128GB",
        serialNumber: "F2LZF1234567",
        expiryDate: "2029-03-18",
        pdfUrl: "https://phonespot.dk/api/warranty/pdf/test123",
        verificationUrl: "https://phonespot.dk/garanti/verificer?code=test123",
      }),
    );
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Dit garantibevis — PS-GAR-2026-00001", html });
    results.push({ name: "Garantibevis", ok: true });
  } catch (e) {
    results.push({ name: "Garantibevis", ok: false, error: String(e) });
  }

  // ── 7. Abandoned Cart ──
  try {
    const html = await render(
      AbandonedCartEmail({
        customerName: "Test Kunde",
        items: [
          { title: "Apple iPhone 13 Pro 128GB Sort — Grade B", price: 349900 },
          { title: "iPhone 13 Pro Beskyttelsesglas", price: 9900 },
        ],
        total: 359800,
        recoveryUrl: "https://phonespot.dk/kurv?recover=test123",
      }),
    );
    await resend.emails.send({ from: EMAIL_FROM, to, subject: "[TEST] Du glemte noget i din kurv!", html });
    results.push({ name: "Abandoned cart", ok: true });
  } catch (e) {
    results.push({ name: "Abandoned cart", ok: false, error: String(e) });
  }

  return NextResponse.json({ results, sentTo: to });
}
