import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeFrisbiiOrder } from "@/lib/payments/frisbii/order-payment";
import { ConfirmationView } from "./confirmation-view";

interface RawOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number | null;
  item_type: "device" | "sku_product";
  upgrade_details: Array<{ label: string; price_oere: number }> | null;
  device: {
    grade: string | null;
    color: string | null;
    storage: string | null;
    template: { display_name: string; images: string[] } | null;
  } | null;
  sku_product: { title: string; images: string[] } | null;
}

interface RawOrder {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  bundle_discount_amount: number | null;
  shipping_cost: number;
  total: number;
  created_at: string;
  customer: { name: string; email: string } | null;
  order_items: RawOrderItem[];
}

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; id?: string; provider?: string }>;
}) {
  // Stripe sender ?session_id=cs_…; Frisbii sender ?id=cs_…&invoice=<handle>.
  // Begge gemmes i orders.stripe_checkout_session_id.
  const params = await searchParams;
  const sessionId = params.session_id ?? (params.provider === "frisbii" ? params.id : undefined);

  if (!sessionId) {
    return <ConfirmationError message="Vi kunne ikke finde oplysninger om din bestilling." />;
  }

  // Server-side fetch with service role bypasses RLS — Stripe session IDs are
  // long random strings, so URL-as-access-token is acceptable here.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      subtotal,
      discount_amount,
      bundle_discount_amount,
      shipping_cost,
      total,
      created_at,
      payment_method,
      stripe_payment_id,
      customer:customers!customer_id (name, email),
      order_items (
        id,
        quantity,
        unit_price,
        total_price,
        discount_amount,
        item_type,
        upgrade_details,
        device:devices!device_id (
          grade,
          color,
          storage,
          template:product_templates!template_id (display_name, images)
        ),
        sku_product:sku_products!sku_product_id (title, images)
      )
    `,
    )
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  if (error || !data) {
    return (
      <ConfirmationError message="Vi kunne ikke finde din ordre. Kontakt os på info@phonespot.dk." />
    );
  }

  const raw = data as unknown as RawOrder & { payment_method?: string | null; stripe_payment_id?: string | null };

  // Frisbii-webhooken kan komme et øjeblik efter kunden. Status hentes fra
  // Frisbiis API (aldrig fra URL-parametrene), og ordren færdiggøres her, hvis
  // betalingen allerede er gennemført. Idempotent med webhooken.
  if (raw.payment_method === "frisbii" && raw.status === "pending" && raw.stripe_payment_id) {
    try {
      const result = await completeFrisbiiOrder(raw.stripe_payment_id);
      if (result === "completed") raw.status = "confirmed";
    } catch (err) {
      console.error("[bekraeftelse] frisbii completion failed:", err);
    }
  }
  const order = {
    id: raw.id,
    order_number: raw.order_number,
    status: raw.status,
    subtotal: raw.subtotal,
    discount_amount: raw.discount_amount,
    bundle_discount_amount: raw.bundle_discount_amount ?? 0,
    shipping_cost: raw.shipping_cost,
    total: raw.total,
    customer_name: raw.customer?.name ?? "",
    customer_email: raw.customer?.email ?? "",
    created_at: raw.created_at,
    order_items: raw.order_items.map((item) => {
      const isDevice = item.item_type === "device";
      const title = isDevice
        ? item.device?.template?.display_name ?? "Enhed"
        : item.sku_product?.title ?? "Produkt";
      const image = isDevice
        ? item.device?.template?.images?.[0] ?? null
        : item.sku_product?.images?.[0] ?? null;
      return {
        id: item.id,
        title,
        image_url: image,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.total_price,
        line_discount: item.discount_amount ?? 0,
        item_type: item.item_type,
        grade: isDevice ? item.device?.grade ?? null : null,
        color: isDevice ? item.device?.color ?? null : null,
        storage: isDevice ? item.device?.storage ?? null : null,
        upgrade_details: item.upgrade_details ?? null,
      };
    }),
  };

  return <ConfirmationView order={order} />;
}

function ConfirmationError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center px-4">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-8 w-8 text-red-500"
        >
          <path
            fillRule="evenodd"
            d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.998-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal">
        Noget gik galt
      </h1>
      <p className="mt-4 text-sm text-gray-600">{message}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Gå til forsiden
        </Link>
        <Link
          href="/kontakt"
          className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
        >
          Kontakt os
        </Link>
      </div>
    </div>
  );
}
