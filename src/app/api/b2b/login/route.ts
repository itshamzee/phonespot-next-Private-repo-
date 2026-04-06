import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * POST /api/b2b/login
 * Authenticates a B2B user and returns the session token + user profile.
 * The context (b2b-context.tsx) stores both in localStorage.
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email og adgangskode er pakraevet" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user || !authData.session) {
    return NextResponse.json(
      { error: "Forkert email eller adgangskode" },
      { status: 401 }
    );
  }

  // Fetch B2B profile
  const { data: b2b, error: b2bError } = await supabase
    .from("b2b_customers")
    .select(
      "id, company_name, cvr_nummer, approved, rejected, rejected_reason, contact_name, contact_email, price_group, discount_percentage"
    )
    .eq("auth_id", authData.user.id)
    .single();

  if (b2bError || !b2b) {
    return NextResponse.json(
      { error: "Ingen B2B-konto fundet for denne email" },
      { status: 404 }
    );
  }

  if (b2b.rejected) {
    const reason = b2b.rejected_reason
      ? ` Aarsag: ${b2b.rejected_reason}`
      : " Kontakt os for mere information.";
    return NextResponse.json(
      { error: `Din ansogning er blevet afvist.${reason}` },
      { status: 403 }
    );
  }

  return NextResponse.json({
    token: authData.session.access_token,
    user: {
      id: b2b.id,
      companyName: b2b.company_name,
      cvrNummer: b2b.cvr_nummer,
      approved: b2b.approved,
      contactName: b2b.contact_name,
      contactEmail: b2b.contact_email,
      priceGroup: b2b.price_group ?? null,
      discountPercentage: b2b.discount_percentage ?? 0,
    },
  });
}
