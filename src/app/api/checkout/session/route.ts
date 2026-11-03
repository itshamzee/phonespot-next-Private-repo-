import { NextRequest, NextResponse } from "next/server";
import { validateCart, hasFoxwayDevice, toServerItems } from "@/lib/checkout/validate";
import { validateDiscountCode } from "@/lib/checkout/discount";
import { createOrder } from "@/lib/checkout/order";
import { createCheckoutSession } from "@/lib/stripe/checkout-session";
import { createFrisbiiCheckoutSession } from "@/lib/payments/frisbii/checkout-session";
import { getCheckoutProvider } from "@/lib/payments/provider";
import { calcBundleDiscounts, calcDiscount, calcSubtotal } from "@/lib/cart/utils";
import type { CartItem, CartDeviceItem, DiscountApplication } from "@/lib/cart/types";
import type { CustomerInfo } from "@/lib/checkout/order";
import { createServerClient } from "@/lib/supabase/client";
import { getShippingPrice, getShippingOption, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import type { ShippingMethod as ShippingMethodId } from "@/lib/shipmondo/types";

// Prices come from lib/shipping, which is also what the checkout page renders.
// They were listed here as well, so the price shown and the price charged were
// two separate facts that had already drifted apart.

interface CheckoutSessionRequest {
  items: CartItem[];
  customer: CustomerInfo;
  discountCode?: string;
  shippingMethod: string;
  pickupPoint?: {
    id: string;
    name: string;
    address: string;
    zipcode: string;
    city: string;
    carrier_code: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutSessionRequest;
    const { items, customer, discountCode, shippingMethod, pickupPoint } = body;

    // 1. Basic validation
    if (!items?.length) {
      return NextResponse.json({ error: "Kurven er tom" }, { status: 400 });
    }
    if (!customer?.email || !customer?.name) {
      return NextResponse.json({ error: "Kundeoplysninger mangler" }, { status: 400 });
    }
    const listPrice = shippingMethod ? getShippingPrice(shippingMethod) : undefined;
    if (listPrice === undefined) {
      return NextResponse.json({ error: "Ugyldig leveringsmetode" }, { status: 400 });
    }

    // Booking a parcel-shop delivery without a shop fails at the carrier, so it
    // is refused before the customer is charged.
    const needsPickupPoint =
      getShippingOption(shippingMethod as ShippingMethodId)?.requires_pickup_point === true;
    if (needsPickupPoint && !pickupPoint?.id) {
      return NextResponse.json({ error: "Vælg en pakkeshop" }, { status: 400 });
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
    const serverItems = toServerItems(validation.items);
    const subtotal = calcSubtotal(serverItems);

    // 3b. Compute bundle discounts server-side (never trust client-computed discount amounts)
    const bundle = calcBundleDiscounts(serverItems);
    const bundleDiscountAmount = bundle.total;
    console.log("[checkout/session] bundleDiscountAmount:", bundleDiscountAmount, "øre");

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
    let shippingCost = listPrice;
    if (discount?.type === "free_shipping") {
      shippingCost = 0;
    } else if (subtotal - discountAmount - bundleDiscountAmount >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
    }

    const total = Math.max(0, subtotal - discountAmount - bundleDiscountAmount + shippingCost);

    // 4b. Decrement stock for Foxway devices
    {
      const supabase = createServerClient();
      for (const vi of validation.items) {
        if (vi.item.type !== "device") continue;
        const deviceItem = vi.item as CartDeviceItem;

        if (vi.deviceSource === "foxway") {
          const { error } = await supabase.rpc("decrement_foxway_stock", {
            p_device_id: deviceItem.deviceId,
          });
          if (error) {
            return NextResponse.json(
              { error: "En vare er desværre udsolgt" },
              { status: 409 },
            );
          }
        }
      }
    }

    // 5. Create order with placeholder session ID
    const provider = getCheckoutProvider();
    const createdOrder = await createOrder({
      items: validation.items,
      customer,
      discount,
      discountCodeId,
      shippingMethod,
      pickupPoint: pickupPoint ?? null,
      shippingCost,
      subtotal,
      discountAmount,
      bundleDiscountAmount,
      total,
      bundleByKey: bundle.byKey,
      stripeCheckoutSessionId: "pending",
      paymentMethod: provider,
      foxwayPending: hasFoxwayDevice(validation.items),
    });

    // 6. Create the payment session (Stripe Checkout or Frisbii Checkout)
    const sessionParams = {
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
      bundleDiscountAmount,
      total,
    };
    const isPickup = shippingMethod.startsWith("pickup_") || shippingMethod.startsWith("click_collect_");
    const checkoutSession = provider === "frisbii"
      ? await createFrisbiiCheckoutSession({ ...sessionParams, shippingAddress: !isPickup })
      : await createCheckoutSession(sessionParams);

    // 7. Update order with the real session ID (and the Frisbii charge handle,
    //    which is how the Frisbii webhook finds the order again)
    const supabase = createServerClient();
    await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: checkoutSession.sessionId,
        ...("handle" in checkoutSession ? { stripe_payment_id: checkoutSession.handle } : {}),
      })
      .eq("id", createdOrder.id);

    // 8. Return session details to client
    return NextResponse.json({
      sessionId: checkoutSession.sessionId,
      url: checkoutSession.url,
      provider,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    });
  } catch (err) {
    console.error("[checkout/session] error:", err);
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
