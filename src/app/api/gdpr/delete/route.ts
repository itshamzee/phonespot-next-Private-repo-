import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { deleteCustomerData } from "@/lib/gdpr";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/gdpr/delete
 * Delete/anonymize customer data (GDPR Art. 17 — right to be forgotten).
 *
 * Access: Owner role only (deletion requests are processed by staff).
 * Financial records are retained per Bogføringsloven but anonymized.
 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners can process deletion requests
  const { data: staff } = await supabase
    .from("staff")
    .select("role, name")
    .eq("auth_id", user.id)
    .single();

  if (!staff || staff.role !== "owner") {
    return NextResponse.json(
      { error: "Kun ejere kan behandle sletningsanmodninger" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { customer_id, confirmation } = body;

  if (!customer_id) {
    return NextResponse.json({ error: "customer_id påkrævet" }, { status: 400 });
  }

  // Require explicit confirmation to prevent accidental deletion
  if (confirmation !== "SLET_KUNDEDATA") {
    return NextResponse.json(
      { error: "Bekræft sletning med confirmation: 'SLET_KUNDEDATA'" },
      { status: 400 }
    );
  }

  // Get customer email before deletion (for confirmation)
  const { data: customer } = await supabase
    .from("customers")
    .select("email, name")
    .eq("id", customer_id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Kunde ikke fundet" }, { status: 404 });
  }

  const originalEmail = customer.email;
  const originalName = customer.name;

  const result = await deleteCustomerData(customer_id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Send confirmation to the original email (if it was a real email)
  if (originalEmail && !originalEmail.includes("@anonymized.")) {
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: originalEmail,
        subject: "Bekræftelse af datasletning — PhoneSpot",
        text: [
          `Kære ${originalName},`,
          "",
          "Vi bekræfter hermed, at dine personoplysninger er blevet slettet fra PhoneSpots systemer",
          "i henhold til din anmodning og GDPR artikel 17 (retten til sletning).",
          "",
          "Bemærk: Transaktionsdata, der er nødvendige i henhold til den danske bogføringslov",
          "(5 års opbevaring), er anonymiseret men bevaret i overensstemmelse med lovkravene.",
          "",
          "Har du spørgsmål, er du velkommen til at kontakte os på info@phonespot.dk.",
          "",
          "Med venlig hilsen,",
          "PhoneSpot ApS",
        ].join("\n"),
      });
    } catch {
      // Email failure should not block deletion confirmation
      console.warn("Failed to send deletion confirmation email");
    }
  }

  return NextResponse.json({
    success: true,
    message: "Kundedata slettet/anonymiseret. Transaktionsdata bevaret per Bogføringsloven.",
    processedBy: staff.name,
    processedAt: new Date().toISOString(),
  });
}
