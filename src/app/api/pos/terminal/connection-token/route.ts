import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/pos/terminal/connection-token
 * Creates a connection token for the Stripe Terminal SDK.
 */
export async function POST() {
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
