import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, subject, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "PhoneSpot Kontakt <noreply@phonespot.dk>",
      to: "info@phonespot.dk",
      replyTo: email,
      subject: `Kontakt: ${subject || "Generel henvendelse"}`,
      text: `Navn: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke sende besked" },
      { status: 500 },
    );
  }
}
