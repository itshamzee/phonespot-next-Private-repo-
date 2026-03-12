import { NextRequest, NextResponse } from "next/server";
import { validateCart } from "@/lib/checkout/validate";
import type { CartItem } from "@/lib/cart/types";

export async function POST(req: NextRequest) {
  const { items } = (await req.json()) as { items: CartItem[] };
  if (!items?.length) {
    return NextResponse.json({ valid: false, errors: ["Kurven er tom"] }, { status: 400 });
  }
  const result = await validateCart(items);
  return NextResponse.json(result);
}
