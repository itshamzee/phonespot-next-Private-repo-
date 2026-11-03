import { createServerClient } from "@/lib/supabase/client";
import { finalizeCheckoutOrder } from "@/lib/checkout/finalize-order";
import { sendPushover } from "@/lib/notifications/pushover";
import { chargeAmount, frisbii, isChargePaid } from "./client";

/**
 * Frisbii-ordrer genbruger de eksisterende kolonner, så der ikke kræves en
 * migration før skiftet:
 *   orders.payment_method             = 'frisbii'
 *   orders.stripe_checkout_session_id = Frisbii session-id (cs_…)
 *   orders.stripe_payment_id          = Frisbii charge-handle (S-1234)
 */

interface FrisbiiOrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_id: string | null;
}

const ORDER_COLUMNS =
  "id, order_number, status, total, payment_method, stripe_checkout_session_id, stripe_payment_id";

async function findOrderByHandle(handle: string): Promise<FrisbiiOrderRow | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("payment_method", "frisbii")
    .eq("stripe_payment_id", handle)
    .maybeSingle();
  return (data as FrisbiiOrderRow | null) ?? null;
}

export type FrisbiiCompletionResult =
  | "completed"
  | "not_found"
  | "not_paid"
  | "amount_mismatch";

/**
 * Kaldes fra webhooken (invoice_authorized / invoice_settled) og fra
 * oprydnings-cron'en. Stoler aldrig på webhook-body: status og beløb hentes
 * fra Frisbiis API, før lageret trækkes.
 */
export async function completeFrisbiiOrder(handle: string): Promise<FrisbiiCompletionResult> {
  const order = await findOrderByHandle(handle);
  if (!order) {
    console.warn("[frisbii] ingen webshop-ordre for handle", handle);
    return "not_found";
  }
  if (!order.stripe_checkout_session_id) throw new Error(`Frisbii-ordre ${order.order_number} mangler session-id`);

  const charge = await frisbii.getCharge(handle);
  if (!charge || !isChargePaid(charge)) {
    console.warn("[frisbii] charge ikke betalt:", handle, charge?.state ?? "ukendt");
    return "not_paid";
  }

  const paid = chargeAmount(charge);
  if (charge.currency !== "DKK" || paid !== order.total) {
    // Ingen genforsøg hjælper her — alarmér og lad personalet afgøre det.
    console.error("[frisbii] beløb matcher ikke ordren:", handle, paid, charge.currency, order.total);
    await sendPushover({
      title: `Frisbii-beløb matcher ikke ordre ${order.order_number}`,
      message: `Betalt ${paid / 100} ${charge.currency}, ordren er på ${order.total / 100} DKK. Ordren er ikke bekræftet — tjek den i admin og i Frisbii.`,
      sound: "siren",
      priority: 1,
      url: `https://phonespot.dk/admin/platform/orders/${order.id}`,
      url_title: "Åbn ordren",
    }).catch(() => {});
    return "amount_mismatch";
  }

  await finalizeCheckoutOrder({
    orderId: order.id,
    sessionId: order.stripe_checkout_session_id,
    paymentId: handle,
  });
  return "completed";
}

export type SettleResult =
  | { status: "skipped"; reason: string }
  | { status: "settled" }
  | { status: "failed"; error: string };

/**
 * Hæver en reserveret Frisbii-betaling. Kaldes når en ordre sendes eller
 * afhentes. No-op for Stripe-ordrer (de hæves allerede ved køb) og for
 * Frisbii-ordrer, der allerede er hævet. Kaster aldrig — en fejl alarmerer
 * personalet, men må ikke stoppe forsendelsen.
 */
export async function settleOrderPayment(orderId: string): Promise<SettleResult> {
  try {
    const supabase = createServerClient();
    const { data: order } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", orderId)
      .maybeSingle();
    const row = order as FrisbiiOrderRow | null;
    if (!row) return { status: "skipped", reason: "order_not_found" };
    if (row.payment_method !== "frisbii" || !row.stripe_payment_id) {
      return { status: "skipped", reason: "not_frisbii" };
    }

    const handle = row.stripe_payment_id;
    const charge = await frisbii.getCharge(handle);
    if (!charge) return fail(row, "Frisbii kender ikke betalingen");
    if (charge.state === "settled") return { status: "skipped", reason: "already_settled" };
    if (charge.state !== "authorized") return fail(row, `Betalingen har status '${charge.state}'`);

    const settled = await frisbii.settleCharge(handle, { key: `settle-${handle}` });
    if (settled.state !== "settled" || settled.error_state) {
      return fail(row, settled.error ?? settled.error_state ?? `status '${settled.state}'`);
    }

    await supabase.from("activity_log").insert({
      action: "payment_settled",
      entity_type: "order",
      entity_id: row.id,
      details: { provider: "frisbii", handle, amount: settled.amount },
    });
    return { status: "settled" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[frisbii] settle fejlede:", orderId, message);
    await sendPushover({
      title: "Frisbii-betaling kunne ikke hæves",
      message: `Ordre ${orderId}: ${message}. Hæv den manuelt i Frisbii.`,
      priority: 1,
      url: `https://phonespot.dk/admin/platform/orders/${orderId}`,
      url_title: "Åbn ordren",
    }).catch(() => {});
    return { status: "failed", error: message };
  }
}

async function fail(order: FrisbiiOrderRow, error: string): Promise<SettleResult> {
  console.error("[frisbii] settle fejlede:", order.order_number, error);
  await sendPushover({
    title: `Betaling for ${order.order_number} kunne ikke hæves`,
    message: `${error}. Varen er markeret som sendt/afhentet — hæv betalingen manuelt i Frisbii.`,
    priority: 1,
    url: `https://phonespot.dk/admin/platform/orders/${order.id}`,
    url_title: "Åbn ordren",
  }).catch(() => {});
  return { status: "failed", error };
}

/**
 * Stripe sender checkout.session.expired; Frisbii har ingen tilsvarende
 * webhook. Denne oprydning gør det samme for Frisbii-ordrer, der har stået
 * som pending længere end sessionens levetid:
 *   - ingen/fejlet/annulleret betaling → expire_checkout_order (frigiver
 *     reservationer og gør kurven klar til gendannelsesmail)
 *   - betalt, men webhooken er aldrig nået frem → færdiggør ordren
 *   - "pending" hos Frisbii (asynkron betaling) → vent
 */
export async function sweepStaleFrisbiiOrders(olderThanMinutes = 45): Promise<{
  expired: number;
  completed: number;
  waiting: number;
  errors: number;
}> {
  const supabase = createServerClient();
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("payment_method", "frisbii")
    .eq("type", "online")
    .eq("status", "pending")
    .eq("payment_status", "pending")
    .lt("created_at", cutoff)
    .limit(200);

  const result = { expired: 0, completed: 0, waiting: 0, errors: 0 };
  for (const order of (data ?? []) as FrisbiiOrderRow[]) {
    try {
      const handle = order.stripe_payment_id;
      const charge = handle ? await frisbii.getCharge(handle) : null;
      if (charge && isChargePaid(charge)) {
        const r = await completeFrisbiiOrder(handle!);
        if (r === "completed") result.completed++;
        else result.errors++;
        continue;
      }
      if (charge && (charge.state === "pending" || charge.processing)) {
        result.waiting++;
        continue;
      }
      const { error } = await supabase.rpc("expire_checkout_order", {
        p_order_id: order.id,
        p_session_id: order.stripe_checkout_session_id,
      });
      if (error) throw new Error(error.message);
      result.expired++;
    } catch (err) {
      result.errors++;
      console.error("[frisbii] oprydning fejlede for", order.order_number, err);
    }
  }
  return result;
}

/**
 * En kortbetaling er typisk kun reserveret i ca. 7 dage. Ordrer, der er
 * bekræftet men ikke sendt/afhentet efter `days`, risikerer at miste
 * reservationen — personalet får besked i stedet for at systemet hæver før
 * levering.
 */
export async function findAgingAuthorizations(days = 5): Promise<Array<{ id: string; order_number: string }>> {
  const supabase = createServerClient();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, stripe_payment_id")
    .eq("payment_method", "frisbii")
    .eq("status", "confirmed")
    .lt("confirmed_at", cutoff)
    .limit(100);

  const aging: Array<{ id: string; order_number: string }> = [];
  for (const o of (data ?? []) as Array<{ id: string; order_number: string; stripe_payment_id: string | null }>) {
    if (!o.stripe_payment_id) continue;
    const charge = await frisbii.getCharge(o.stripe_payment_id).catch(() => null);
    if (charge?.state === "authorized") aging.push({ id: o.id, order_number: o.order_number });
  }
  return aging;
}
