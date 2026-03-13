import { NextRequest, NextResponse } from "next/server";
import { validateDiscountCode } from "@/lib/discount/validate";

/**
 * POST /api/discount-codes/validate
 * Validate a discount code during checkout.
 * Public endpoint (anyone checking out can validate).
 *
 * Body: { code: string, subtotal: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Angiv en rabatkode" }, { status: 400 });
    }

    if (typeof subtotal !== "number" || subtotal < 0) {
      return NextResponse.json({ error: "Ugyldig subtotal" }, { status: 400 });
    }

    const result = await validateDiscountCode(code, subtotal);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      discount: result.discount,
    });
  } catch (err) {
    console.error("Discount validation error:", err);
    return NextResponse.json(
      { error: "Fejl ved validering af rabatkode" },
      { status: 500 }
    );
  }
}
