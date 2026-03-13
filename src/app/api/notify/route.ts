import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * POST /api/notify
 * Subscribe to "notify me" alerts for a product template.
 * Public endpoint — requires email, template_id, optional grade preference.
 *
 * Body: { email: string, templateId: string, gradePreference?: "A" | "B" | "C" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { email, templateId, gradePreference } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: "Produkt mangler" }, { status: 400 });
    }

    // Check for existing subscription
    const { data: existing } = await supabase
      .from("notify_requests")
      .select("id")
      .eq("customer_email", email)
      .eq("template_id", templateId)
      .eq("status", "waiting")
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Du er allerede tilmeldt notifikationer for dette produkt",
      });
    }

    const { error: insertError } = await supabase
      .from("notify_requests")
      .insert({
        customer_email: email,
        template_id: templateId,
        grade_preference: gradePreference ?? null,
        status: "waiting",
      });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: "Du far besked nar produktet er pa lager!",
    });
  } catch (err) {
    console.error("Notify subscribe error:", err);
    return NextResponse.json({ error: "Fejl" }, { status: 500 });
  }
}

/**
 * DELETE /api/notify
 * Unsubscribe from a notify request.
 *
 * Body: { email: string, templateId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { email, templateId } = body;

    if (!email || !templateId) {
      return NextResponse.json({ error: "Manglende data" }, { status: 400 });
    }

    await supabase
      .from("notify_requests")
      .update({ status: "purchased" }) // Mark as resolved
      .eq("customer_email", email)
      .eq("template_id", templateId)
      .eq("status", "waiting");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify unsubscribe error:", err);
    return NextResponse.json({ error: "Fejl" }, { status: 500 });
  }
}
