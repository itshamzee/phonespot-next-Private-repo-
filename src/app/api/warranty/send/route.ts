import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { render } from "@react-email/components";
import { createElement } from "react";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { WarrantyCertificateEmail } from "@/lib/email/templates/warranty-certificate";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/**
 * POST /api/warranty/send
 * Send warranty certificate email to customer.
 *
 * Body: { warranty_id: string } or { order_id: string } (sends all for that order)
 * Access: Staff only.
 */
export async function POST(request: NextRequest) {
  try {
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

    const { data: staff } = await supabase
      .from("staff")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { warranty_id, order_id } = body;

    let query = supabase
      .from("warranties")
      .select(`
        id,
        guarantee_number,
        expires_at,
        pdf_url,
        qr_verification_code,
        devices (
          serial_number,
          product_templates ( display_name )
        ),
        customers ( name, email ),
        orders ( order_number )
      `);

    if (warranty_id) {
      query = query.eq("id", warranty_id);
    } else if (order_id) {
      query = query.eq("order_id", order_id);
    } else {
      return NextResponse.json({ error: "warranty_id eller order_id påkrævet" }, { status: 400 });
    }

    const { data: warranties, error: queryError } = await query;

    if (queryError || !warranties || warranties.length === 0) {
      return NextResponse.json({ error: "Ingen garantibeviser fundet" }, { status: 404 });
    }

    let sent = 0;

    for (const warranty of warranties) {
      const customer = warranty.customers as { name: string; email: string } | null;
      const device = warranty.devices as {
        serial_number: string | null;
        product_templates: { display_name: string } | null;
      } | null;

      if (!customer?.email) continue;

      const emailHtml = await render(
        createElement(WarrantyCertificateEmail, {
          customerName: customer.name,
          guaranteeNumber: warranty.guarantee_number,
          deviceModel: device?.product_templates?.display_name || "Enhed",
          serialNumber: device?.serial_number || null,
          expiryDate: warranty.expires_at,
          pdfUrl: warranty.pdf_url || "",
          verificationUrl: `${SITE_URL}/garanti/${warranty.qr_verification_code}`,
        })
      );

      await resend.emails.send({
        from: EMAIL_FROM,
        to: customer.email,
        subject: `Dit garantibevis — ${warranty.guarantee_number}`,
        html: emailHtml,
      });

      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error("Warranty email error:", err);
    return NextResponse.json(
      { error: "Fejl ved afsendelse af garantibevis" },
      { status: 500 }
    );
  }
}
