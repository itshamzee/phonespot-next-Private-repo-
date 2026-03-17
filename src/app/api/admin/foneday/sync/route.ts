import { NextResponse } from "next/server";
import { syncCatalog } from "@/lib/foneday/sync";

/**
 * POST /api/admin/foneday/sync
 * Manual sync trigger from admin UI.
 */
export async function POST() {
  try {
    const stats = await syncCatalog();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
