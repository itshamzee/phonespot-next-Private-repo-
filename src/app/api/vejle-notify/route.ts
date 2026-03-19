import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * POST /api/vejle-notify
 * Register an email to be notified when PhoneSpot Vejle opens.
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Upsert so duplicate submissions are handled gracefully
    const { error } = await supabase
      .from("vejle_opening_signups")
      .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

    if (error) {
      console.error("vejle-notify insert error:", error);
      return NextResponse.json({ error: "Fejl ved tilmelding" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("vejle-notify error:", err);
    return NextResponse.json({ error: "Intern fejl" }, { status: 500 });
  }
}
