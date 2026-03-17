import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/pos/terminal/create-payment-intent
 * Creates a PaymentIntent for in-person Terminal payments.
 */
export async function POST(req: NextRequest) {
  try {
    const { amount, orderId } = await req.json();

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: "Amount must be at least 100 øre (1 DKK)" },
        { status: 400 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "dkk",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        order_id: orderId || "",
        source: "pos_terminal",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    console.error("[terminal] Failed to create payment intent:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create payment intent" },
      { status: 500 },
    );
  }
}
