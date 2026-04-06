import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendB2BWelcomeEmail } from "@/lib/email/b2b-welcome";

/**
 * POST /api/b2b/register
 * Creates a Supabase auth user + customer + b2b_customer row.
 * The b2b_customer.approved starts as false — requires manual staff approval.
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const { companyName, cvrNummer, contactName, email, phone, password } = body as {
    companyName?: string;
    cvrNummer?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    password?: string;
  };

  if (!companyName || !cvrNummer || !contactName || !email || !password) {
    return NextResponse.json({ error: "Alle felter er påkrævede" }, { status: 400 });
  }

  // Validate CVR format (8 digits)
  if (!/^\d{8}$/.test(cvrNummer)) {
    return NextResponse.json({ error: "CVR-nummer skal være 8 cifre" }, { status: 400 });
  }

  // Basic password length check
  if (password.length < 8) {
    return NextResponse.json({ error: "Adgangskode skal være mindst 8 tegn" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Guard: CVR already registered
  const { data: existingCvr } = await supabase
    .from("b2b_customers")
    .select("id")
    .eq("cvr_nummer", cvrNummer)
    .maybeSingle();

  if (existingCvr) {
    return NextResponse.json(
      { error: "CVR-nummeret er allerede registreret" },
      { status: 409 }
    );
  }

  // Guard: email already has a Supabase auth account
  const { data: existingAuth } = await supabase
    .from("customers")
    .select("auth_id")
    .eq("email", email)
    .maybeSingle();

  if (existingAuth?.auth_id) {
    return NextResponse.json(
      { error: "Der eksisterer allerede en konto med denne email" },
      { status: 409 }
    );
  }

  // Create Supabase auth user (service role — auto-confirms email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { type: "b2b", company_name: companyName },
  });

  if (authError || !authData.user) {
    console.error("B2B auth create error:", authError?.message);
    return NextResponse.json(
      { error: authError?.message ?? "Kunne ikke oprette brugerkonto" },
      { status: 500 }
    );
  }

  const authId = authData.user.id;

  // Find or create customer row
  // Note: customers.email has no UNIQUE constraint, so we can't use upsert on email.
  // Instead: try to find existing customer by email, update auth_id. If not found, insert new.
  let customerId: string;

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existingCustomer) {
    // Update existing customer with auth_id
    const { error: updateErr } = await supabase
      .from("customers")
      .update({ auth_id: authId, name: contactName, phone: phone ?? null })
      .eq("id", existingCustomer.id);
    if (updateErr) {
      console.error("B2B customer update error:", updateErr.message);
      await supabase.auth.admin.deleteUser(authId).catch(() => {});
      return NextResponse.json({ error: "Kunne ikke oprette kundeprofil" }, { status: 500 });
    }
    customerId = existingCustomer.id;
  } else {
    // Insert new customer
    const { data: newCustomer, error: insertErr } = await supabase
      .from("customers")
      .insert({ email, name: contactName, phone: phone ?? null, auth_id: authId })
      .select("id")
      .single();
    if (insertErr || !newCustomer) {
      console.error("B2B customer insert error:", insertErr?.message);
      await supabase.auth.admin.deleteUser(authId).catch(() => {});
      return NextResponse.json({ error: "Kunne ikke oprette kundeprofil" }, { status: 500 });
    }
    customerId = newCustomer.id;
  }

  // Create b2b_customer record
  const { data: b2bCustomer, error: b2bError } = await supabase
    .from("b2b_customers")
    .insert({
      customer_id: customerId,
      company_name: companyName,
      cvr_nummer: cvrNummer,
      contact_name: contactName,
      contact_email: email,
      contact_phone: phone ?? null,
      auth_id: authId,
      approved: false,
      rejected: false,
      payment_terms: "prepay",
      discount_percentage: 0,
    })
    .select("id")
    .single();

  if (b2bError || !b2bCustomer) {
    console.error("B2B customer insert error:", b2bError?.message);
    await supabase.auth.admin.deleteUser(authId).catch(() => {});
    return NextResponse.json({ error: b2bError?.message ?? "Fejl ved oprettelse" }, { status: 500 });
  }

  // Log activity (non-blocking — fire and forget, ignore errors)
  void supabase
    .from("activity_log")
    .insert({
      actor_id: null,
      action: "b2b_registration",
      entity_type: "b2b_customer",
      entity_id: b2bCustomer.id,
      details: { company_name: companyName, cvr_nummer: cvrNummer, contact_email: email },
    });

  // Send welcome email (non-blocking)
  void sendB2BWelcomeEmail({
    companyName,
    contactName,
    contactEmail: email,
    cvrNummer,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
