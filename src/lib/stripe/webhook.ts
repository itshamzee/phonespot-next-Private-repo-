import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";
import { stripe } from "@/lib/stripe/client";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import { generateWarrantiesForOrder } from "@/lib/warranty/generate";
import { convertDraftToOrder } from "@/lib/draft-orders/convert";
import { notifyNewOrder, sendPushover } from "@/lib/notifications/pushover";
import { sendStaffOrderNotification } from "@/lib/email/staff-order-notification";

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // Draft order payment: if the session was created for a draft order,
  // convert it to a confirmed order and return early.
  const draftOrderId = session.metadata?.draft_order_id;
  if (draftOrderId) {
    console.log("[webhook] draft order payment received, converting:", draftOrderId);
    await convertDraftToOrder(draftOrderId);
    console.log("[webhook] draft order converted:", draftOrderId);
    return;
  }

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
       subtotal, discount_amount, shipping_cost, shipping_method, withdrawal_token, stock_failure_at,
       order_items(id, item_type, device_id, sku_product_id, quantity, unit_price, battery_upgrade, upgrade_details)`,
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("[webhook] order could not be read:", orderId);
    throw new Error("Checkout order could not be read");
  }

  const orderItems: Array<{
    id: string;
    item_type: string;
    device_id: string | null;
    sku_product_id: string | null;
    quantity: number;
    unit_price: number;
    battery_upgrade?: boolean;
    upgrade_details?: Array<{ label: string; price_oere: number }> | null;
  }> = (order as any).order_items ?? [];

  // 2. Collect device IDs to fetch purchase_price and vat_scheme
  const deviceIds = orderItems
    .filter((i) => i.item_type === "device" && i.device_id)
    .map((i) => i.device_id as string);

  // Resolve battery metadata before finalizing immutable order items.
  const batteryItemIds = new Set<string>();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ["data.price.product"] });
  for (const li of lineItems.data) {
    const product = li.price?.product;
    if (!product || typeof product === "string" || product.deleted) continue;
    const meta = (product as Stripe.Product).metadata;
    if (meta?.kind !== "battery-upgrade" || !meta.parent_item_key) continue;
    const [kind, id] = meta.parent_item_key.split(":");
    for (const item of orderItems) {
      if ((kind === "device" && item.device_id === id) || (kind === "sku" && item.sku_product_id === id)) batteryItemIds.add(item.id);
    }
  }
  const { data: completion, error: completionError } = await supabase.rpc("complete_checkout_order", {
    p_order_id: orderId, p_session_id: session.id,
    p_payment_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    p_battery_item_ids: [...batteryItemIds],
  });
  if (completionError || !completion) throw new Error("Checkout stock transaction failed");
  if (completion.status === "already_completed" || completion.status === "already_finalized") return;
  if (completion.status !== "completed") {
    const code = completion.code ?? completion.status;
    console.error("[webhook] checkout stock failure:", orderId, code);
    // Kunden har betalt, men lager/reservation kunne ikke bekræftes. Ordren
    // står som pending/paid med stock_failure_code. Stripe prøver webhooken
    // igen; alarmér kun personalet ved første fejl, ikke ved hvert genforsøg.
    if (completion.status === "stock_failed" && !order.stock_failure_at) {
      await sendPushover({
        title: `Betalt ordre ${order.order_number} kunne ikke bekræftes`,
        message: `Lager eller reservation fejlede (${code}). Ordren skal afklares manuelt i admin, før den kan bekræftes eller refunderes.`,
        sound: "siren",
        priority: 1,
        url: `https://phonespot.dk/admin/platform/orders/${orderId}`,
        url_title: "Åbn ordren",
      });
    }
    throw new Error("Checkout stock could not be committed");
  }
  for (const item of orderItems) if (batteryItemIds.has(item.id)) item.battery_upgrade = true;

  // 7. Increment discount code usage
  if (order.discount_code_id) {
    const { error: discountError } = await supabase.rpc(
      "increment_discount_usage",
      { p_discount_code_id: order.discount_code_id },
    );
    if (discountError) {
      console.error("[webhook] failed to increment discount usage:", discountError);
    }
  }

  // 8. Generate warranty certificates for device items
  if (deviceIds.length > 0) {
    try {
      await generateWarrantiesForOrder(orderId);
    } catch (warrantyErr) {
      console.error("[webhook] failed to generate warranties:", warrantyErr);
      // Non-fatal: warranties can be regenerated manually
    }
  }

  // 9. Fetch customer details for confirmation email
  const { data: customer } = await supabase
    .from("customers")
    .select("email, name, phone")
    .eq("id", order.customer_id)
    .single();

  // 10. Resolve product names and images for email (shared by all notifications)
  const fmtKr = (ore: number) =>
    new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(ore / 100);

  const itemNames: string[] = [];
  const enrichedItems: Array<{
    id: string;
    itemType: "device" | "sku_product";
    deviceId: string | null;
    skuProductId: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    title: string;
    image?: string;
    batteryUpgrade?: boolean;
    upgrades?: Array<{ label: string; priceOere: number }>;
    // sku_products.category — a sku_product can itself be a device-category
    // product (see DEVICE_CATEGORIES), so the confirmation email's guarantee
    // wording can't just assume item_type "sku_product" means accessory.
    category?: string | null;
  }> = [];

  for (const item of orderItems) {
    let title = "";
    let image: string | undefined;
    let category: string | null | undefined;

    if (item.item_type === "device" && item.device_id) {
      const { data: dev } = await supabase
        .from("devices")
        .select("storage, color, grade, template:product_templates(brand, model, display_name, images)")
        .eq("id", item.device_id)
        .single();
      const t = (dev as any)?.template;
      if (t) {
        const parts = [t.display_name || [t.brand, t.model].filter(Boolean).join(" ")];
        if (dev?.storage) parts.push(dev.storage);
        if (dev?.color) parts.push(dev.color);
        if (dev?.grade) parts.push(`Grade ${dev.grade}`);
        title = parts.join(" · ");
        image = t.images?.[0] || undefined;
        itemNames.push(`• ${title} — ${fmtKr(item.unit_price)}`);
      }
    } else if (item.sku_product_id) {
      const { data: sku } = await supabase
        .from("sku_products")
        .select("title, images, category")
        .eq("id", item.sku_product_id)
        .single();
      title = sku?.title || "Tilbehør";
      image = sku?.images?.[0] || undefined;
      category = sku?.category ?? null;
      const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
      itemNames.push(`• ${title}${qty} — ${fmtKr(item.unit_price * item.quantity)}`);
    }

    enrichedItems.push({
      id: item.id,
      itemType: item.item_type as "device" | "sku_product",
      deviceId: item.device_id,
      skuProductId: item.sku_product_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.unit_price * item.quantity,
      title: title || (item.item_type === "device" ? "Brugt enhed" : "Produkt"),
      image,
      batteryUpgrade: item.battery_upgrade ?? false,
      upgrades: item.upgrade_details?.map((u) => ({
        label: u.label,
        priceOere: u.price_oere,
      })),
      category,
    });
  }

  // 11. Send order confirmation email with product names + images
  if (customer) {
    try {
      await sendOrderConfirmation({
        orderId,
        orderNumber: order.order_number,
        customer: {
          email: customer.email,
          name: customer.name,
        },
        items: enrichedItems,
        subtotal: order.subtotal ?? orderItems.reduce(
          (sum, i) => sum + i.unit_price * i.quantity,
          0,
        ),
        discountAmount: order.discount_amount ?? 0,
        shippingCost: order.shipping_cost ?? 0,
        total: order.total,
        withdrawalToken: order.withdrawal_token ?? "",
        shippingMethod: (order as any).shipping_method ?? undefined,
      });
    } catch (emailErr) {
      console.error("[webhook] failed to send confirmation email:", emailErr);
    }
  }

  // 12. Send push notification to staff (Pushover — cashregister sound)
  try {
    await notifyNewOrder({
      orderNumber: order.order_number,
      customerName: customer?.name || "Ukendt kunde",
      customerEmail: customer?.email,
      totalKr: fmtKr(order.total),
      itemCount: orderItems.length,
      itemSummary: itemNames.join("\n") || undefined,
      shippingKr: order.shipping_cost ? fmtKr(order.shipping_cost) : undefined,
      discountKr: order.discount_amount ? fmtKr(order.discount_amount) : undefined,
    });
  } catch (notifyErr) {
    console.error("[webhook] pushover notification failed:", notifyErr);
  }

  // 13. Send staff email notification (non-fatal)
  try {
    await sendStaffOrderNotification({
      orderNumber: order.order_number,
      customerName: customer?.name || "Ukendt kunde",
      customerEmail: customer?.email,
      customerPhone: customer?.phone,
      total: order.total,
      shippingCost: order.shipping_cost ?? 0,
      shippingMethod: (order as any).shipping_method ?? null,
      items: itemNames.length > 0
        ? orderItems.map((item, idx) => {
            // Re-use the item name built for Pushover, stripping the bullet and price
            const rawLine = itemNames[idx] || "";
            const name = rawLine.replace(/^•\s*/, "").replace(/\s*—\s*[\d.,]+\s*kr\.\s*$/, "").trim() || "Produkt";
            return { name, quantity: item.quantity, unitPrice: item.unit_price };
          })
        : orderItems.map((i) => ({
            name: i.item_type === "device" ? "Brugt enhed" : "Tilbehør",
            quantity: i.quantity,
            unitPrice: i.unit_price,
          })),
    });
  } catch (staffEmailErr) {
    console.error("[webhook] staff order notification email failed:", staffEmailErr);
  }

  console.log("[webhook] order confirmed:", order.order_number);
}

export async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const supabase = createServerClient();
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const { error } = await supabase.rpc("expire_checkout_order", { p_order_id: orderId, p_session_id: session.id });
  if (error) throw new Error("Checkout expiry transaction failed");
}
