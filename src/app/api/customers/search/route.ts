import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { sanitizeSearch } from "@/lib/repairs/catalog";

/**
 * GET /api/customers/search?q=&type=privat|erhverv
 * Søger på navn, mail, telefon, firma og CVR. `type` begrænser til Privat eller Erhverv.
 * Svar: kunder med enheder, de nye erhvervsfelter (ean, invoice_email, contact_person) og
 * ticket_count (antal tidligere sager).
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  // Kun bogstaver/tal: kommaer og parenteser ville ellers kunne bryde or()-filteret.
  const q = sanitizeSearch(params.get("q"));
  const type = params.get("type");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createServerClient();
  let query = supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,company_name.ilike.%${q}%,cvr.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (type === "privat" || type === "erhverv") query = query.eq("type", type);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const customers = (data ?? []) as Array<{ id: string }>;

  // Antal tidligere sager pr. kunde: én billig forespørgsel for hele resultatet.
  const counts = new Map<string, number>();
  if (customers.length > 0) {
    const { data: tickets } = await supabase
      .from("repair_tickets")
      .select("customer_id")
      .in("customer_id", customers.map((c) => c.id));
    for (const t of (tickets ?? []) as Array<{ customer_id: string | null }>) {
      if (t.customer_id) counts.set(t.customer_id, (counts.get(t.customer_id) ?? 0) + 1);
    }
  }
  return NextResponse.json(customers.map((c) => ({ ...c, ticket_count: counts.get(c.id) ?? 0 })));
}
