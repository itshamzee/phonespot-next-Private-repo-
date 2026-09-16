import { NextRequest, NextResponse, after } from "next/server";
import { runMailAgent } from "@/lib/mail-agent/run";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * /api/cron/mail-agent — hvert 20. minut, udloest af Supabase pg_cron
 * (se supabase/migrations/20260916_mail_agent_schedule.sql). Vercel Hobby
 * tillader kun daglige crons, saa planen ligger i databasen.
 *
 * Svarer med det samme og koerer selve arbejdet bagefter (after), saa den
 * kaldende side ikke behoever holde forbindelsen aaben i op til 5 minutter.
 * Resultatet gemmes i mail_agent_runs. Auth: Bearer CRON_SECRET.
 * ?sync=1 venter paa resultatet (til manuel test).
 */
async function handle(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY er ikke sat" }, { status: 500 });
  }

  if (req.nextUrl.searchParams.get("sync") === "1") {
    const report = await runMailAgent();
    return NextResponse.json(report, { status: report.errors.length ? 207 : 200 });
  }

  after(async () => {
    try {
      const report = await runMailAgent();
      console.log("[mail-agent] koersel faerdig", JSON.stringify(report));
    } catch (err) {
      console.error("[mail-agent] koersel fejlede", err);
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}

export const GET = handle;
export const POST = handle;
