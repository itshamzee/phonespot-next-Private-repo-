import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/repair-part-costs
 * Daglig: opdaterer kostpris paa reparationsdele fra Foneday-kataloget (titel-match) og rydder
 * gamle idempotensnoegler til Ny sag. Koerer efter foneday-sync. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const costs = await supabase.rpc("repair_parts_refresh_costs", { p_dry_run: false });
  if (costs.error) console.error("[repair-part-costs] refresh failed:", costs.error);
  const cleanup = await supabase.rpc("repair_case_requests_cleanup", { p_days: 7 });
  if (cleanup.error) console.error("[repair-part-costs] cleanup failed:", cleanup.error);

  const ok = !costs.error && !cleanup.error;
  const body = {
    costs: costs.error ? { error: costs.error.message } : costs.data,
    cleanup_deleted: cleanup.error ? { error: cleanup.error.message } : cleanup.data,
  };
  console.log("[repair-part-costs]", JSON.stringify(body));
  return NextResponse.json(body, { status: ok ? 200 : 500 });
}
