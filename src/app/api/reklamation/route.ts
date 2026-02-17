import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, orderNumber, description } = body;

  if (!name || !email || !orderNumber || !description) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "PhoneSpot Reklamation <noreply@phonespot.dk>",
      to: "reklamation@phonespot.dk",
      replyTo: email,
      subject: `Reklamation: ${orderNumber}`,
      text: `Navn: ${name}\nEmail: ${email}\nOrdrenummer: ${orderNumber}\n\n${description}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke sende reklamation" },
      { status: 500 },
    );
  }
}
