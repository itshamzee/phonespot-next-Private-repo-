import { NextRequest, NextResponse } from "next/server";
import { runMailAgent } from "@/lib/mail-agent/run";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/mail-agent — hver 20. minut (vercel.json).
 * Henter ulaest mail fra one.com-postkasserne, laegger kundemails i
 * Henvendelser og gemmer et AI-forslag til svar. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY er ikke sat" }, { status: 500 });
  }
  const report = await runMailAgent();
  return NextResponse.json(report, { status: report.errors.length ? 207 : 200 });
}
