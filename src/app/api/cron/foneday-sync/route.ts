import { NextRequest, NextResponse } from "next/server";
import { syncCatalog } from "@/lib/foneday/sync";

/**
 * GET /api/cron/foneday-sync
 * Syncs full Foneday product catalog into foneday_catalog table.
 * Run every 30 minutes via Vercel Cron. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await syncCatalog();
    console.log("[foneday-sync]", stats);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[foneday-sync] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
