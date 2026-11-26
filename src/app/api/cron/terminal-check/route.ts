import { NextRequest, NextResponse } from "next/server";
import { FlatpayClient, FlatpayError, flatpayConfig, flatpayStoreConfig, flatpayTerminalId } from "@/lib/pos/flatpay";

export const maxDuration = 60;

/**
 * GET /api/cron/terminal-check?store=<slug>   Auth: Bearer CRON_SECRET.
 * Driftstjek af en butiks kortterminal: forbindelse og X-rapport (aflæser kun,
 * nulstiller ikke terminalen). Bruges ved opsætning af en ny terminal.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const store = params.get("store") ?? "";
  const config = flatpayStoreConfig(flatpayConfig(), store);
  const terminalId = flatpayTerminalId(config, store);
  if (!terminalId) return NextResponse.json({ error: "Ingen terminal for butikken" }, { status: 404 });
  const client = new FlatpayClient(config);
  try {
    const connected = await client.isConnected(terminalId);
    const report = await client.report("x", terminalId, params.get("object_type") ?? undefined);
    return NextResponse.json({ connected, report });
  } catch (err) {
    const e = err instanceof FlatpayError ? { status: err.status, message: err.message, code: err.developerCode } : { message: "Uventet fejl" };
    return NextResponse.json({ error: e }, { status: 502 });
  }
}
