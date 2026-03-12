import { NextRequest, NextResponse } from "next/server";
import { validateCart } from "@/lib/checkout/validate";
import { validateDiscountCode } from "@/lib/checkout/discount";
import { createOrder } from "@/lib/checkout/order";
import { createCheckoutSession } from "@/lib/stripe/checkout-session";
import { calcDiscount, calcSubtotal } from "@/lib/cart/utils";
import type { CartItem, DiscountApplication } from "@/lib/cart/types";
import type { CustomerInfo } from "@/lib/checkout/order";
import { createServerClient } from "@/lib/supabase/client";

const SHIPPING_METHODS: Record<string, number> = {
  dao: 4900,       // 49 kr — DAO Pakke
  postnord: 5900,  // 59 kr — PostNord Pakke
  free: 0,
};

const FREE_SHIPPING_THRESHOLD = 50000; // 500 kr in øre

interface CheckoutSessionRequest {
  items: CartItem[];
  customer: CustomerInfo;
  discountCode?: string;
  shippingMethod: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutSessionRequest;
    const { items, customer, discountCode, shippingMethod } = body;

    // 1. Basic validation
    if (!items?.length) {
      return NextResponse.json({ error: "Kurven er tom" }, { status: 400 });
    }
    if (!customer?.email || !customer?.name) {
      return NextResponse.json({ error: "Kundeoplysninger mangler" }, { status: 400 });
    }
    if (!shippingMethod || !(shippingMethod in SHIPPING_METHODS)) {
      return NextResponse.json({ error: "Ugyldig leveringsmetode" }, { status: 400 });
    }

    // 2. Validate cart items server-side
    const validation = await validateCart(items);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Kurven er ikke gyldig", errors: validation.errors },
        { status: 422 },
      );
    }

    // 3. Calculate server-side totals
    const serverItems = validation.items.map((vi) => ({
      ...vi.item,
      price: vi.serverPrice,
    })) as CartItem[];
    const subtotal = calcSubtotal(serverItems);

    // 4. Validate discount code if provided
    let discount: DiscountApplication | null = null;
    let discountCodeId: string | null = null;

    if (discountCode?.trim()) {
      const discountResult = await validateDiscountCode(discountCode.trim(), subtotal);
      if (!discountResult.valid) {
        return NextResponse.json({ error: discountResult.error }, { status: 422 });
      }

      // Fetch the discount code ID for later usage increment
      const supabase = createServerClient();
      const { data: codeRow } = await supabase
        .from("discount_codes")
        .select("id")
        .eq("code", discountCode.toUpperCase().trim())
        .single();
      discountCodeId = codeRow?.id ?? null;

      discount = {
        code: discountResult.code!,
        type: discountResult.type!,
        value: discountResult.value!,
        discountAmount: calcDiscount(subtotal, {
          code: discountResult.code!,
          type: discountResult.type!,
          value: discountResult.value!,
          discountAmount: 0,
        }),
      };
    }

    const discountAmount = discount ? calcDiscount(subtotal, discount) : 0;

    // Determine shipping cost (free shipping threshold or free_shipping discount)
    let shippingCost = SHIPPING_METHODS[shippingMethod];
    if (discount?.type === "free_shipping") {
      shippingCost = 0;
    } else if (subtotal - discountAmount >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
    }

    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    // 5. Create order with placeholder Stripe session ID
    const createdOrder = await createOrder({
      items: validation.items,
      customer,
      discount,
      discountCodeId,
      shippingMethod,
      shippingCost,
      subtotal,
      discountAmount,
      total,
      stripeCheckoutSessionId: "pending",
    });

    // 6. Create Stripe Checkout session
    const checkoutSession = await createCheckoutSession({
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      items: validation.items,
      customer,
      discount,
      discountCodeId,
      shippingMethod,
      shippingCost,
      subtotal,
      discountAmount,
      total,
    });

    // 7. Update order with real Stripe session ID
    const supabase = createServerClient();
    await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: checkoutSession.sessionId })
      .eq("id", createdOrder.id);

    // 8. Return session details to client
    return NextResponse.json({
      sessionId: checkoutSession.sessionId,
      url: checkoutSession.url,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    });
  } catch (err) {
    console.error("[checkout/session] error:", err);
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
