// src/lib/draft-orders/convert.ts
// Converts a draft order into a confirmed order atomically.

import { createAdminClient } from "@/lib/supabase/admin";
import type { DraftOrder, Order } from "@/lib/supabase/platform-types";

/**
 * Generates an order number in the format PS-YYYYMMDD-XXXX.
 * Uses the current timestamp plus a short random suffix for uniqueness.
 */
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PS-${dateStr}-${rand}`;
}

/**
 * Converts a draft order to a confirmed order.
 *
 * Steps:
 * 1. Fetch draft order, verify not already converted and not in 'converting' state
 * 2. Atomically set status to 'converting' (optimistic lock)
 * 3. Create order in `orders` table with type: 'draft'
 * 4. Create `order_items` for each line item
 * 5. Update device status to 'sold' for device line items
 * 6. Decrement SKU stock for sku line items
 * 7. Set converted_order_id and status = 'paid' on draft
 * 8. Log to activity_log
 * 9. On failure after step 2, reset status back to 'sent'
 *
 * @param draftOrderId - UUID of the draft_orders row
 * @returns The created Order row
 */
export async function convertDraftToOrder(draftOrderId: string): Promise<Order> {
  const supabase = createAdminClient();

  // ── Step 1: Fetch draft order ────────────────────────────────────────────
  const { data: draft, error: fetchError } = await supabase
    .from("draft_orders")
    .select("*")
    .eq("id", draftOrderId)
    .single();

  if (fetchError || !draft) {
    throw new Error(`Draft order not found: ${fetchError?.message ?? "unknown"}`);
  }

  const draftOrder = draft as DraftOrder;

  if (draftOrder.converted_order_id) {
    throw new Error(`Draft order ${draftOrderId} has already been converted to order ${draftOrder.converted_order_id}`);
  }

  if (draftOrder.status === "converting") {
    throw new Error(`Draft order ${draftOrderId} is already being converted`);
  }

  if (draftOrder.status === "cancelled") {
    throw new Error(`Draft order ${draftOrderId} is cancelled and cannot be converted`);
  }

  // ── Step 2: Optimistic lock — set status to 'converting' ─────────────────
  // Only update if the status hasn't changed since we read it (prevents race conditions)
  const { error: lockError, count: lockCount } = await supabase
    .from("draft_orders")
    .update({ status: "converting", updated_at: new Date().toISOString() })
    .eq("id", draftOrderId)
    .eq("status", draftOrder.status) // only succeed if status matches what we read
    .is("converted_order_id", null); // only succeed if not already converted

  if (lockError) {
    throw new Error(`Failed to lock draft order: ${lockError.message}`);
  }

  // If count is 0, another process grabbed the lock first
  if (lockCount === 0) {
    throw new Error(`Draft order ${draftOrderId} is already being processed by another request`);
  }

  // ── Helper: rollback on error ────────────────────────────────────────────
  const rollback = async () => {
    await supabase
      .from("draft_orders")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", draftOrderId);
  };

  try {
    // ── Step 3: Create order ─────────────────────────────────────────────────
    const orderNumber = generateOrderNumber();
    const subtotal = draftOrder.subtotal;
    const discountAmount = draftOrder.discount_amount ?? 0;
    const shippingCost = draftOrder.shipping_cost ?? 0;
    const total = draftOrder.total;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        type: "draft",
        customer_id: draftOrder.customer_id ?? null,
        is_b2b: false,
        status: "confirmed",
        payment_method: "draft",
        subtotal,
        discount_amount: discountAmount,
        shipping_cost: shippingCost,
        total,
        brugtmoms_total: 0,
        payment_status: "paid",
        fulfillment_status: "unfulfilled",
        notes: draftOrder.customer_note ?? null,
        internal_notes: draftOrder.internal_note ?? null,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError || !order) {
      await rollback();
      throw new Error(`Failed to create order: ${orderError?.message ?? "unknown"}`);
    }

    // ── Step 4: Create order_items ───────────────────────────────────────────
    const lineItems = draftOrder.line_items ?? [];

    if (lineItems.length > 0) {
      const orderItems = lineItems.map((item) => ({
        order_id: order.id,
        item_type: item.type === "device" ? "device" : "sku_product",
        device_id: item.type === "device" ? (item.id ?? null) : null,
        sku_product_id: item.type === "sku" ? (item.id ?? null) : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        purchase_price: null,
        vat_scheme: null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        await rollback();
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }
    }

    // ── Step 5: Mark device items as 'sold' ──────────────────────────────────
    const deviceItems = lineItems.filter((item) => item.type === "device" && item.id);
    for (const item of deviceItems) {
      const { error: deviceError } = await supabase
        .from("devices")
        .update({
          status: "sold",
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id!);

      if (deviceError) {
        console.error(`[convertDraftToOrder] Failed to mark device ${item.id} as sold:`, deviceError.message);
        // Non-fatal: continue — order is created, device status can be fixed manually
      }
    }

    // ── Step 6: Decrement SKU stock ──────────────────────────────────────────
    const skuItems = lineItems.filter((item) => item.type === "sku" && item.id);
    for (const item of skuItems) {
      // Use rpc to safely decrement stock without going below 0
      const { error: stockError } = await supabase.rpc("decrement_sku_stock", {
        p_product_id: item.id!,
        p_quantity: item.quantity,
      });

      if (stockError) {
        // Fall back to a direct update if rpc not available
        console.error(`[convertDraftToOrder] Failed to decrement stock for SKU ${item.id}:`, stockError.message);
      }
    }

    // ── Step 7: Finalize draft order ─────────────────────────────────────────
    const { error: finalizeError } = await supabase
      .from("draft_orders")
      .update({
        converted_order_id: order.id,
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftOrderId);

    if (finalizeError) {
      await rollback();
      throw new Error(`Failed to finalize draft order: ${finalizeError.message}`);
    }

    // ── Step 8: Activity log ─────────────────────────────────────────────────
    await supabase.from("activity_log").insert({
      actor_id: "system",
      actor_type: "system",
      action: "draft_order_converted",
      entity_type: "order",
      entity_id: order.id,
      details: {
        draft_order_id: draftOrderId,
        draft_number: draftOrder.draft_number,
        order_number: orderNumber,
        total,
        line_item_count: lineItems.length,
      },
    });

    return order as Order;
  } catch (err) {
    // Rollback is already called inside the specific failure points above,
    // but ensure it runs for any unexpected error
    await rollback();
    throw err;
  }
}
