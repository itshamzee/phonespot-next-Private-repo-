import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  applyLocationScope,
  applyStoreScope,
  loadLocationIndex,
  requireStaffScope,
  unauthorizedResponse,
} from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/nav-counts — tallene i sidemenuen og notifikationerne, afgrænset til
 * personalets butik. `repairs` er åbne sager; `newRepairs` er sager, der ikke er modtaget endnu.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { scope } = ctx;

  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const head = { count: "exact", head: true } as const;

  const [orders, repairs, newRepairs, inquiries, buyback] = await Promise.all([
    applyLocationScope(supabase.from("orders").select("id", head).eq("status", "pending"), scope, index),
    // Menu-tallet er åbne sager (alt undtagen afhentet og løst reklamation)
    applyStoreScope(
      supabase.from("repair_tickets").select("id", head).not("status", "in", "(afhentet,reklamation_loest)"),
      scope,
    ),
    applyStoreScope(supabase.from("repair_tickets").select("id", head).eq("status", "modtaget"), scope),
    applyStoreScope(
      supabase.from("contact_inquiries").select("id", head).eq("status", "ny").neq("source", "saelg-enhed"),
      scope,
    ),
    applyStoreScope(
      supabase.from("contact_inquiries").select("id", head).eq("status", "ny").eq("source", "saelg-enhed"),
      scope,
    ),
  ]);

  return NextResponse.json(
    {
      orders: orders.count ?? 0,
      repairs: repairs.count ?? 0,
      newRepairs: newRepairs.count ?? 0,
      inquiries: inquiries.count ?? 0,
      buyback: buyback.count ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
