import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import { generateWarrantiesForOrder } from "@/lib/warranty/generate";

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const supabase = createServerClient();
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error("[webhook] checkout.session.completed missing order_id in metadata");
    return;
  }

  // 1. Fetch order with items
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, customer_id, total, discount_code_id,
       order_items(id, item_type, device_id, sku_product_id, quantity, unit_price)`,
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("[webhook] order not found:", orderId, orderError);
    return;
  }

  if (order.status !== "pending") {
    console.log("[webhook] order already processed:", orderId, order.status);
    return;
  }

  const orderItems: Array<{
    id: string;
    item_type: string;
    device_id: string | null;
    sku_product_id: string | null;
    quantity: number;
    unit_price: number;
  }> = (order as any).order_items ?? [];

  // 2. Collect device IDs to fetch purchase_price and vat_scheme
  const deviceIds = orderItems
    .filter((i) => i.item_type === "device" && i.device_id)
    .map((i) => i.device_id as string);

  let deviceMap = new Map<
    string,
    { purchase_price: number; vat_scheme: string }
  >();
  if (deviceIds.length > 0) {
    const { data: devices } = await supabase
      .from("devices")
      .select("id, purchase_price, vat_scheme")
      .in("id", deviceIds);
    deviceMap = new Map(
      (devices ?? []).map((d) => [
        d.id,
        { purchase_price: d.purchase_price, vat_scheme: d.vat_scheme },
      ]),
    );
  }

  // 3. Mark order as confirmed and calculate brugtmoms
  let brugtmomsTotal = 0;
  for (const item of orderItems) {
    if (item.item_type === "device" && item.device_id) {
      const dev = deviceMap.get(item.device_id);
      if (dev?.vat_scheme === "brugtmoms") {
        const margin = item.unit_price - (dev.purchase_price ?? 0);
        const brugtmoms = Math.max(0, Math.round((margin * 25) / 100));
        brugtmomsTotal += brugtmoms;
      }
    }
  }

  const { error: confirmError } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      brugtmoms_total: brugtmomsTotal,
      stripe_payment_id: session.payment_intent as string | null,
    })
    .eq("id", orderId);

  if (confirmError) {
    console.error("[webhook] failed to confirm order:", confirmError);
    throw new Error(`Failed to confirm order: ${confirmError.message}`);
  }

  // 4. Mark devices as sold + back-fill purchase_price/vat_scheme on order_items
  for (const item of orderItems) {
    if (item.item_type === "device" && item.device_id) {
      const dev = deviceMap.get(item.device_id);

      // Mark device as sold
      await supabase
        .from("devices")
        .update({ status: "sold" })
        .eq("id", item.device_id);

      // Back-fill purchase_price and vat_scheme on order_item
      if (dev) {
        await supabase
          .from("order_items")
          .update({
            purchase_price: dev.purchase_price,
            vat_scheme: dev.vat_scheme,
          })
          .eq("id", item.id);
      }
    }
  }

  // 5. Decrement SKU stock via RPC for sku_product items
  const skuItems = orderItems.filter(
    (i) => i.item_type === "sku_product" && i.sku_product_id,
  );
  for (const item of skuItems) {
    const { error: stockError } = await supabase.rpc("decrement_sku_stock", {
      p_product_id: item.sku_product_id,
      p_quantity: item.quantity,
    });
    if (stockError) {
      console.error(
        "[webhook] failed to decrement stock for SKU:",
        item.sku_product_id,
        stockError,
      );
      // Non-fatal: log but don't throw — order is already confirmed
    }
  }

  // 6. Increment discount code usage
  if (order.discount_code_id) {
    const { error: discountError } = await supabase.rpc(
      "increment_discount_usage",
      { p_discount_code_id: order.discount_code_id },
    );
    if (discountError) {
      console.error("[webhook] failed to increment discount usage:", discountError);
    }
  }

  // 7. Generate warranty certificates for device items
  if (deviceIds.length > 0) {
    try {
      await generateWarrantiesForOrder(orderId);
    } catch (warrantyErr) {
      console.error("[webhook] failed to generate warranties:", warrantyErr);
      // Non-fatal: warranties can be regenerated manually
    }
  }

  // 8. Fetch customer details for confirmation email
  const { data: customer } = await supabase
    .from("customers")
    .select("email, name, phone")
    .eq("id", order.customer_id)
    .single();

  // 9. Send order confirmation email
  if (customer) {
    try {
      await sendOrderConfirmation({
        orderId,
        orderNumber: order.order_number,
        customer: {
          email: customer.email,
          name: customer.name,
        },
        items: orderItems.map((i) => ({
          id: i.id,
          itemType: i.item_type as "device" | "sku_product",
          deviceId: i.device_id,
          skuProductId: i.sku_product_id,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          totalPrice: i.unit_price * i.quantity,
        })),
        subtotal: orderItems.reduce(
          (sum, i) => sum + i.unit_price * i.quantity,
          0,
        ),
        discountAmount: 0, // fetched from order if needed
        shippingCost: 0,   // fetched from order if needed
        total: order.total,
        withdrawalToken: "",
      });
    } catch (emailErr) {
      console.error("[webhook] failed to send confirmation email:", emailErr);
      // Non-fatal: don't throw — order is already confirmed
    }
  }

  console.log("[webhook] order confirmed:", order.order_number);
}

export async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const supabase = createServerClient();
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  // Cancel order
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, order_items(id, item_type, device_id)")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "pending") return;

  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  // Release device reservations
  const orderItems: Array<{ id: string; item_type: string; device_id: string | null }> =
    (order as any).order_items ?? [];
  const deviceIds = orderItems
    .filter((i) => i.item_type === "device" && i.device_id)
    .map((i) => i.device_id as string);

  if (deviceIds.length > 0) {
    await supabase
      .from("devices")
      .update({ status: "listed", reservation_expires_at: null })
      .in("id", deviceIds);
  }

  console.log("[webhook] order cancelled (session expired):", orderId);
}
