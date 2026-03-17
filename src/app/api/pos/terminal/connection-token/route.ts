import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

/**
 * POST /api/pos/terminal/connection-token
 * Creates a connection token for the Stripe Terminal SDK.
 * Called automatically by the Terminal SDK when it needs a fresh token.
 */
export async function POST() {
  try {
    const connectionToken = await stripe.terminal.connectionTokens.create();
    return NextResponse.json({ secret: connectionToken.secret });
  } catch (err: any) {
    console.error("[terminal] Failed to create connection token:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create connection token" },
      { status: 500 },
    );
  }
}
