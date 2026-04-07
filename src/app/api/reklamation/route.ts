import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/reklamation
 * Submit a complaint (reklamation) for an order, or an account deletion request.
 *
 * When called with a Bearer token (authenticated customer portal):
 *   - Validates the customer and optionally verifies the order belongs to them
 *   - Sends internal notification + customer confirmation
 *
 * Legacy unauthenticated form (name, email, orderNumber, description):
 *   - Still supported for any existing public form usage
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const authHeader = request.headers.get("authorization");

  // --- Authenticated path (customer portal) ---
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const supabase = createServerClient();
      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("id, name, email")
        .eq("auth_id", user.id)
        .single();

      if (!customer) {
        return NextResponse.json({ error: "Ingen kundeprofil fundet" }, { status: 404 });
      }

      const { order_id, description, contact_email, type } = body;

      if (!description || typeof description !== "string" || description.trim().length < 10) {
        return NextResponse.json({ error: "Beskrivelse er for kort" }, { status: 400 });
      }

      // Look up order number if provided
      let orderNumber = "N/A";
      if (order_id) {
        const { data: order } = await supabase
          .from("orders")
          .select("order_number, customer_id")
          .eq("id", order_id)
          .single();

        if (order && order.customer_id !== customer.id) {
          return NextResponse.json({ error: "Ordre tilhorer ikke denne konto" }, { status: 403 });
        }
        if (order) orderNumber = order.order_number;
      }

      const isAccountDeletion = type === "account_deletion";
      const replyAddress = contact_email ?? customer.email;

      const internalSubject = isAccountDeletion
        ? `[GDPR] Anmodning om kontosletning — ${customer.email}`
        : `[Reklamation] ${orderNumber} — ${customer.name}`;

      const internalHtml = isAccountDeletion
        ? `<p><strong>Kunde:</strong> ${customer.name} (${customer.email})</p>
           <p><strong>Type:</strong> Anmodning om sletning (GDPR art. 17)</p>
           <p><strong>Besked:</strong> ${description}</p>
           <p><strong>Kontakt:</strong> ${replyAddress}</p>`
        : `<p><strong>Kunde:</strong> ${customer.name} (${customer.email})</p>
           <p><strong>Ordre:</strong> ${orderNumber}</p>
           <p><strong>Beskrivelse:</strong></p>
           <p style="white-space:pre-wrap">${description}</p>
           <p><strong>Kontakt-email:</strong> ${replyAddress}</p>`;

      await resend.emails.send({
        from: "PhoneSpot Reklamation <noreply@phonespot.dk>",
        to: ["hej@phonespot.dk"],
        replyTo: replyAddress,
        subject: internalSubject,
        html: internalHtml,
      });

      const confirmSubject = isAccountDeletion
        ? "Vi har modtaget din anmodning om kontosletning"
        : `Reklamation modtaget — ${orderNumber}`;

      const confirmHtml = isAccountDeletion
        ? `<p>Hej ${customer.name},</p>
           <p>Vi har modtaget din anmodning om sletning af konto og persondata.</p>
           <p>Vi behandler den inden for 30 dage jf. GDPR artikel 17.</p>
           <p>Med venlig hilsen,<br>PhoneSpot-teamet</p>`
        : `<p>Hej ${customer.name},</p>
           <p>Vi har modtaget din reklamation vedr. ordre <strong>${orderNumber}</strong>.</p>
           <p>Vi vender tilbage senest inden for 2 hverdage.</p>
           <p>Med venlig hilsen,<br>PhoneSpot-teamet</p>`;

      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: [replyAddress],
        subject: confirmSubject,
        html: confirmHtml,
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Reklamation (auth) error:", err);
      return NextResponse.json({ error: "Intern fejl" }, { status: 500 });
    }
  }

  // --- Legacy unauthenticated path ---
  const { name, email, orderNumber, description } = body;
  if (!name || !email || !orderNumber || !description) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "PhoneSpot Reklamation <noreply@phonespot.dk>",
      to: ["hej@phonespot.dk"],
      replyTo: email,
      subject: `[Reklamation] ${orderNumber}`,
      text: `Navn: ${name}\nEmail: ${email}\nOrdrenummer: ${orderNumber}\n\n${description}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Kunne ikke sende reklamation" }, { status: 500 });
  }
}
