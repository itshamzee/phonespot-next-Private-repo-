import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * POST /api/admin/b2b/create-demo
 * Creates a pre-approved B2B demo account.
 * DELETE THIS ENDPOINT after use.
 */
export async function POST() {
  const supabase = createServerClient();

  const demoEmail = "demo@phonespot.dk";
  const demoPassword = "PhoneSpot2026!";
  const companyName = "PhoneSpot Demo";
  const cvrNummer = "00000000";
  const contactName = "Demo Forhandler";

  // Check if demo already exists
  const { data: existing } = await supabase
    .from("b2b_customers")
    .select("id")
    .eq("cvr_nummer", cvrNummer)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Demo account already exists", id: existing.id });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: demoEmail,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { type: "b2b", company_name: companyName },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Auth creation failed" }, { status: 500 });
  }

  const authId = authData.user.id;

  // Create customer record
  const { data: customer, error: custError } = await supabase
    .from("customers")
    .insert({ email: demoEmail, name: contactName, auth_id: authId })
    .select("id")
    .single();

  if (custError || !customer) {
    await supabase.auth.admin.deleteUser(authId).catch(() => {});
    return NextResponse.json({ error: custError?.message ?? "Customer creation failed" }, { status: 500 });
  }

  // Create B2B record — pre-approved
  const { data: b2b, error: b2bError } = await supabase
    .from("b2b_customers")
    .insert({
      customer_id: customer.id,
      company_name: companyName,
      cvr_nummer: cvrNummer,
      contact_name: contactName,
      contact_email: demoEmail,
      auth_id: authId,
      approved: true,
      approved_at: new Date().toISOString(),
      rejected: false,
      payment_terms: "net30",
      price_group: "A",
      discount_percentage: 10,
      notes: "Demo account for testing",
    })
    .select("id")
    .single();

  if (b2bError) {
    await supabase.auth.admin.deleteUser(authId).catch(() => {});
    return NextResponse.json({ error: b2bError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    credentials: { email: demoEmail, password: demoPassword },
    b2b_id: b2b?.id,
  });
}
