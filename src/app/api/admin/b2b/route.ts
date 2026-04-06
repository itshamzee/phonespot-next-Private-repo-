import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("b2b_customers")
    .select(
      "id, company_name, cvr_nummer, contact_name, contact_email, contact_phone, approved, rejected, rejected_reason, approved_at, created_at, notes, discount_percentage, price_group, payment_terms"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
