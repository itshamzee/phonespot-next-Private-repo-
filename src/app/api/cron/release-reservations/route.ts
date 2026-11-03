import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFrisbiiConfigured } from "@/lib/payments/frisbii/client";
import { findAgingAuthorizations, sweepStaleFrisbiiOrders } from "@/lib/payments/frisbii/order-payment";
import { sendPushover } from "@/lib/notifications/pushover";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Frisbii først: betalte ordrer, hvis webhook aldrig kom frem, skal
  // færdiggøres, før reservationerne nedenfor frigives.
  const frisbiiResult = isFrisbiiConfigured() ? await runFrisbiiMaintenance() : null;

  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("devices")
    .update({ status: "listed", reservation_expires_at: null })
    .eq("status", "reserved")
    .lt("reservation_expires_at", now)
    .select("id");
  if (error) {
    console.error("Failed to release expired reservations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const count = data?.length ?? 0;
  console.log(`Released ${count} expired device reservations`);

  // -------------------------------------------------------------------------
  // Mark associated orders as abandoned and generate recovery tokens
  // -------------------------------------------------------------------------
  let abandonedCount = 0;
  if (count > 0) {
    const releasedDeviceIds = data.map((d: { id: string }) => d.id);

    // Find pending/checkout orders that contain any of the released devices
    const adminClient = createAdminClient();
    const { data: ordersToAbandon, error: ordersFetchError } = await adminClient
      .from("orders")
      .select("id, items")
      .in("status", ["pending", "checkout"])
      .is("recovery_token", null);

    if (ordersFetchError) {
      console.error("Failed to fetch orders for abandonment:", ordersFetchError);
    } else if (ordersToAbandon && ordersToAbandon.length > 0) {
      const abandonedAt = new Date().toISOString();

      for (const order of ordersToAbandon) {
        // Check if this order contains any of the released devices
        const orderItems: Array<{ device_id?: string }> = Array.isArray(order.items)
          ? order.items
          : [];
        const hasReleasedDevice = orderItems.some(
          (item) => item.device_id && releasedDeviceIds.includes(item.device_id)
        );
        if (!hasReleasedDevice) continue;

        const recoveryToken = crypto.randomUUID();
        const { error: updateError } = await adminClient
          .from("orders")
          .update({
            status: "abandoned",
            abandoned_at: abandonedAt,
            recovery_token: recoveryToken,
          })
          .eq("id", order.id);

        if (updateError) {
          console.error(`Failed to abandon order ${order.id}:`, updateError);
        } else {
          abandonedCount++;
        }
      }
    }
  }

  console.log(`Marked ${abandonedCount} orders as abandoned`);
  return NextResponse.json({ released: count, abandoned: abandonedCount, frisbii: frisbiiResult });
}

async function runFrisbiiMaintenance() {
  try {
    const sweep = await sweepStaleFrisbiiOrders();
    console.log("[cron] frisbii sweep:", sweep);

    const aging = await findAgingAuthorizations(5);
    if (aging.length > 0) {
      await sendPushover({
        title: `${aging.length} betaling(er) kun reserveret i 5+ dage`,
        message: `Send eller udlever snarest, ellers kan reservationen udløbe: ${aging.map((o) => o.order_number).join(", ")}`,
        priority: 1,
        url: "https://phonespot.dk/admin/platform/orders",
        url_title: "Åbn ordrer",
      }).catch(() => {});
    }
    return { ...sweep, aging: aging.length };
  } catch (err) {
    console.error("[cron] frisbii maintenance failed:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
