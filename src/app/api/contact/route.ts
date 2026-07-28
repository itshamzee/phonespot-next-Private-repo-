import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchAutoOffer } from "@/lib/buyback/dispatch";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, subject, message, source, metadata } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  const supabase = createServerClient();
  const normalizedSource = source?.trim() || "kontaktformular";

  // Save to database
  const { data: inserted } = await supabase
    .from("contact_inquiries")
    .insert({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message.trim(),
      source: normalizedSource,
      metadata: metadata || null,
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
  }

  try {
    await resend.emails.send({
      from: "PhoneSpot Kontakt <noreply@phonespot.dk>",
      to: "info@phonespot.dk",
      replyTo: email,
      subject: `Kontakt: ${subject || "Generel henvendelse"}`,
      text: `Navn: ${name}\nEmail: ${email}\n${phone ? `Telefon: ${phone}\n` : ""}\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke sende besked" },
      { status: 500 },
    );
  }
}
