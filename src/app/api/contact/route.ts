import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, subject, message, source, metadata } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Save to database
  await supabase.from("contact_inquiries").insert({
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    subject: subject?.trim() || null,
    message: message.trim(),
    source: source?.trim() || "kontaktformular",
    metadata: metadata || null,
  });

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
