import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { unauthorizedResponse } from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/notify-requests — ventelisten (kunder der vil have besked når en model er på lager).
 * Personale kun. Tabellen har RLS uden policies, så den kan ikke læses fra browseren.
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) return unauthorizedResponse();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("notify_requests")
    .select("id, customer_email, template_id, grade_preference, status, created_at, product_templates(display_name, slug)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
