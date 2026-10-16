import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  applyLocationScope,
  loadLocationIndex,
  requireStaffScope,
  unauthorizedResponse,
} from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/customers/[id]/orders — kundens ordrer, afgrænset til personalets butik.
 * `orders` har RLS uden policies, så kundesiden kan ikke læse den direkte fra browseren.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;

  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const { data, error } = await applyLocationScope(
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, type, total, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    ctx.scope,
    index,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
