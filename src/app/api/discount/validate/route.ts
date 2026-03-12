import { NextRequest, NextResponse } from "next/server";
import { validateDiscountCode } from "@/lib/checkout/discount";

export async function POST(req: NextRequest) {
  const { code, subtotal } = (await req.json()) as { code: string; subtotal: number };
  if (!code) {
    return NextResponse.json({ valid: false, error: "Kode mangler" }, { status: 400 });
  }
  const result = await validateDiscountCode(code, subtotal ?? 0);
  return NextResponse.json(result);
}
