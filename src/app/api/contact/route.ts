import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchAutoOffer } from "@/lib/buyback/dispatch";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { getStaffRecipients } from "@/lib/email/staff-routing";
import { buildConfirmationEmail } from "@/lib/email/buyback-followup-email";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { estimateGuidePrice, loadGuideListings } from "@/lib/buyback/guide-price-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, subject, message, source, metadata, store_id } = body;

  // E-mail er valgfri, hvis kunden har oplyst telefon (fx apparat-formularen).
  if (!name || !message || (!email && !phone)) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  const supabase = createServerClient();
  const normalizedSource = source?.trim() || "kontaktformular";
  // Decides both what we store and which mailbox the staff notification lands in.
  const storeId = normalizeStoreId(store_id);

  // Vejledende priser regnes ud igen her på serveren, så det personalet ser,
  // er det formularen viste, og ikke et tal kunden selv kan have sendt med.
  const guideNote = normalizedSource === "saelg-enhed" ? await guidePriceNote(metadata) : "";

  // Save to database
  const { data: inserted } = await supabase
    .from("contact_inquiries")
    .insert({
      name: name.trim(),
      email: (email ?? "").trim(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message.trim() + guideNote,
      source: normalizedSource,
      metadata: metadata || null,
      store_id: storeId,
    })
    .select("id, name, email, metadata")
    .maybeSingle();

  // Price the lead and, inside the safety envelope, schedule the offer. Awaited
  // rather than detached: a serverless function can be frozen the moment the
  // response returns, and a floating promise would simply be lost.
  // dispatchAutoOffer never throws, so a pricing problem cannot cost us the lead.
  if (normalizedSource === "saelg-enhed" && inserted) {
    await dispatchAutoOffer(createAdminClient(), {
      id: inserted.id,
      name: inserted.name,
      email: inserted.email,
      metadata: inserted.metadata,
    });
    await sendSellConfirmation(createAdminClient(), inserted);
  }

  try {
    await resend.emails.send({
      from: "PhoneSpot Kontakt <noreply@phonespot.dk>",
      ...getStaffRecipients(storeId),
      ...(email ? { replyTo: email } : {}),
      subject: `Kontakt${storeLabel(storeId) === "Generel" ? "" : ` (${storeLabel(storeId)})`}: ${subject || "Generel henvendelse"}`,
      text: `Navn: ${name}\nEmail: ${email}\n${phone ? `Telefon: ${phone}\n` : ""}Butik: ${storeLabel(storeId)}\n\n${message}${guideNote}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke sende besked" },
      { status: 500 },
    );
  }
}

/**
 * Linjer til sagen om, hvilken vejledende pris formularen viste pr. enhed.
 * Tom streng, når funktionen er slået fra eller ingen enhed fik en pris.
 * Kaster aldrig: en prisfejl må ikke koste os henvendelsen.
 */
async function guidePriceNote(metadata: unknown): Promise<string> {
  try {
    const client = createAdminClient();
    const settings = await loadBuybackSettings(client);
    if (!settings.publicPriceEnabled) return "";
    const devices = readLeadDevices(metadata).slice(0, 10);
    if (devices.length === 0) return "";
    const listings = await loadGuideListings(client);
    const lines: string[] = [];
    for (const entry of devices) {
      const estimate = await estimateGuidePrice(client, entry.device, entry.condition, settings, { listings });
      if (estimate.status === "priced") {
        lines.push(`Vejledende pris vist for ${deviceLabel(entry.device)}: ${(estimate.amountOre / 100).toLocaleString("da-DK")} kr.`);
      }
    }
    return lines.length > 0 ? `\n\n${lines.join("\n")}` : "";
  } catch {
    return "";
  }
}

/**
 * The customer used to see only "Tak for din henvendelse" and then nothing for
 * a day. This mail says it arrived, when the offer comes and what happens after.
 * Never throws: the lead is saved, a mail problem must not fail the form.
 */
async function sendSellConfirmation(
  client: ReturnType<typeof createAdminClient>,
  inquiry: { id: string; name: string; email: string; metadata: unknown },
): Promise<void> {
  if (!inquiry.email) return;
  try {
    // The form is public, so this mail can be aimed at any address. Keep what
    // the sender typed out of it as far as possible: catalog model names only
    // (typed-in "min enhed findes ikke" names become "din enhed"), a short first
    // name, and at most one confirmation per address per hour.
    const { count } = await client
      .from("mail_log")
      .select("id", { count: "exact", head: true })
      .eq("to_email", inquiry.email)
      .like("subject", "Vi har din anmodning%")
      .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
    if ((count ?? 0) > 0) return;

    const devices = readLeadDevices(inquiry.metadata);
    const first = devices[0]?.device;
    const fromCatalog = Boolean(first?.brand.trim() && first?.model.trim());
    const catalogLabel = fromCatalog
      ? deviceLabel(first).replace(/^Apple\s+/i, "").slice(0, 60)
      : "";
    const label =
      devices.length > 1
        ? `dine ${Math.min(devices.length, 50)} enheder`
        : catalogLabel
          ? `din ${catalogLabel}`
          : "din enhed";
    const meta = (inquiry.metadata ?? {}) as Record<string, unknown>;
    const { subject, html } = buildConfirmationEmail({
      firstName: (inquiry.name.trim().split(/\s+/)[0] || "der").slice(0, 30),
      deviceLabel: label,
      inStore: meta.deliveryMethod === "Aflever i butik",
    });
    const sent = await resend.emails.send({
      from: "PhoneSpot <info@phonespot.dk>",
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html,
    });
    await client.from("mail_log").insert({
      inquiry_id: inquiry.id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: sent.error ? "failed" : "sent",
      resend_id: sent.data?.id ?? null,
    });
  } catch (err) {
    console.warn("[contact] sell confirmation failed", err);
  }
}
