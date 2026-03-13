import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * POST /api/b2b
 * Register a B2B customer account.
 * Body: { companyName, cvrNummer, contactName, email, phone }
 *
 * GET /api/b2b
 * List B2B customers (staff only).
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { companyName, cvrNummer, contactName, email, phone } = body;

    if (!companyName || !cvrNummer || !email || !contactName) {
      return NextResponse.json(
        { error: "Udfyld firmanavn, CVR-nummer, kontaktperson og email" },
        { status: 400 }
      );
    }

    // Validate CVR format (8 digits)
    if (!/^\d{8}$/.test(cvrNummer)) {
      return NextResponse.json(
        { error: "CVR-nummer skal vaere 8 cifre" },
        { status: 400 }
      );
    }

    // Check for existing B2B customer with this CVR
    const { data: existing } = await supabase
      .from("b2b_customers")
      .select("id")
      .eq("cvr_nummer", cvrNummer)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Firmaet er allerede registreret" },
        { status: 409 }
      );
    }

    // Create or find customer record
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          email,
          name: contactName,
          phone: phone ?? null,
          marketing_consent: false,
        })
        .select("id")
        .single();

      if (customerError || !newCustomer) {
        throw new Error("Failed to create customer");
      }
      customerId = newCustomer.id;
    }

    // Create B2B customer
    const { data: b2bCustomer, error: b2bError } = await supabase
      .from("b2b_customers")
      .insert({
        customer_id: customerId,
        company_name: companyName,
        cvr_nummer: cvrNummer,
        payment_terms: "prepay", // Default to prepay, can be changed after approval
        approved: false, // Requires manual approval
        discount_percentage: 0,
      })
      .select()
      .single();

    if (b2bError) throw b2bError;

    // Log activity
    await supabase.from("activity_log").insert({
      action: "b2b_registration",
      entity_type: "b2b_customer",
      entity_id: b2bCustomer.id,
      details: { company_name: companyName, cvr_nummer: cvrNummer },
    });

    return NextResponse.json({
      success: true,
      message: "Din ansoegning er modtaget. Vi vender tilbage inden for 1-2 hverdage.",
    }, { status: 201 });
  } catch (err) {
    console.error("B2B registration error:", err);
    return NextResponse.json({ error: "Fejl ved registrering" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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
      .select("id")
      .eq("auth_id", user.id)
      .single();
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: b2bCustomers } = await supabase
      .from("b2b_customers")
      .select(`
        *,
        customer:customers ( name, email, phone )
      `)
      .order("created_at", { ascending: false });

    return NextResponse.json({ customers: b2bCustomers ?? [] });
  } catch (err) {
    console.error("B2B list error:", err);
    return NextResponse.json({ error: "Fejl" }, { status: 500 });
  }
}
