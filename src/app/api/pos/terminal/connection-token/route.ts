import { STRIPE_TERMINAL_ENABLED, terminalDisabled } from "@/lib/pos/terminal-flag";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/pos/terminal/connection-token
 * Creates a connection token for the Stripe Terminal SDK.
 */
export async function POST() {
  if (!STRIPE_TERMINAL_ENABLED) return terminalDisabled();
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const connectionToken = await stripe.terminal.connectionTokens.create();
    return NextResponse.json({ secret: connectionToken.secret });
  } catch (err) {
    console.error("[terminal] Failed to create connection token:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create connection token" },
      { status: 500 },
    );
  }
}
