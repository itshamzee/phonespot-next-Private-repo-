import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function RecoverCheckoutPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Fetch order by recovery_token
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, recovery_status, stripe_checkout_session_id, total, shipping_cost, shipping_method, customer:customers(name, email, phone), order_items(id, item_type, device_id, sku_product_id, quantity, unit_price)"
    )
    .eq("recovery_token", token)
    .single();

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Linket er ugyldigt eller udløbet</h1>
          <p className="text-stone-500">
            Dette gendannelseslink er enten ugyldigt eller er allerede blevet brugt.
          </p>
          <a
            href="/"
            className="inline-block mt-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Tilbage til forsiden
          </a>
        </div>
      </div>
    );
  }

  // Kunden åbnede linket for nylig og har stadig en åben betalingsside —
  // send dem tilbage til den i stedet for at afvise linket.
  if (order.status === "pending" && order.payment_status !== "paid" && order.stripe_checkout_session_id) {
    let openUrl: string | null = null;
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
      if (existing.status === "open" && existing.url) openUrl = existing.url;
    } catch {
      openUrl = null;
    }
    if (openUrl) redirect(openUrl);
  }

  // "recovered" sættes først, når betalingen er gennemført (se Stripe-webhooken),
  // så denne side viser kun "betalt", når ordren reelt er betalt.
  if (order.payment_status === "paid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Ordren er allerede betalt</h1>
          <p className="text-stone-500">
            Din ordre #{order.order_number} er betalt. Ordrebekræftelsen er sendt til din e-mail.
          </p>
          <a
            href="/"
            className="inline-block mt-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Tilbage til forsiden
          </a>
        </div>
      </div>
    );
  }

  // Order must be abandoned to recover
  if (order.status !== "abandoned") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Linket er ugyldigt eller udløbet</h1>
          <p className="text-stone-500">
            Dette gendannelseslink kan ikke bruges på nuværende tidspunkt.
          </p>
          <a
            href="/"
            className="inline-block mt-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Tilbage til forsiden
          </a>
        </div>
      </div>
    );
  }

  // Re-reserve devices — check availability
  const customer = Array.isArray(order.customer)
    ? (order.customer[0] ?? null)
    : (order.customer ?? null);

  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
  const { data: reservation, error: reservationError } = await supabase.rpc("reserve_recovery_order", {
    p_order_id: order.id, p_recovery_token: token,
  });
  if (reservationError || reservation?.status !== "reserved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Varen er desværre ikke længere tilgængelig</h1>
          <p className="text-stone-500">
            En eller flere varer i din kurv er blevet solgt, siden du forlod kassen. Du er velkommen til at se vores
            øvrige udvalg.
          </p>
          <a
            href="/brugte-telefoner"
            className="inline-block mt-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Se alle telefoner
          </a>
        </div>
      </div>
    );
  }

  // Build line items for Stripe
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

  // Build line items from order_items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems: any[] = [];
  for (const item of orderItems) {
    if (item.item_type === "device" && item.device_id) {
      const { data: device } = await supabase
        .from("devices")
        .select("sku, color, storage, grade, product_templates(brand, model)")
        .eq("id", item.device_id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const template: any = device
        ? Array.isArray(device.product_templates)
          ? device.product_templates[0]
          : device.product_templates
        : null;

      const name = device
        ? `${[template?.brand, template?.model].filter(Boolean).join(" ") || "Enhed"} — Stand ${device.grade} (${device.storage}, ${device.color})`
        : "Enhed";

      lineItems.push({
        price_data: {
          currency: "dkk",
          product_data: { name },
          unit_amount: item.unit_price,
        },
        quantity: 1,
      });
    } else if (item.item_type === "sku_product" && item.sku_product_id) {
      const { data: skuProduct } = await supabase
        .from("sku_products")
        .select("title")
        .eq("id", item.sku_product_id)
        .single();

      lineItems.push({
        price_data: {
          currency: "dkk",
          product_data: { name: skuProduct?.title ?? "Produkt" },
          unit_amount: item.unit_price,
        },
        quantity: item.quantity,
      });
    }
  }

  // Add shipping if applicable
  if (order.shipping_cost > 0) {
    lineItems.push({
      price_data: {
        currency: "dkk",
        product_data: { name: "Fragt" },
        unit_amount: order.shipping_cost,
      },
      quantity: 1,
    });
  }

  // Create new Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "mobilepay", "klarna"],
    line_items: lineItems,
    customer_email: customer?.email ?? undefined,
    locale: "da",
    currency: "dkk",
    expires_at: expiresAt,
    success_url: `${baseUrl}/ordre/bekraeftelse?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/kasse?cancelled=true`,
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      recovery: "true",
    },
    payment_intent_data: {
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        recovery: "true",
      },
    },
    shipping_address_collection: {
      allowed_countries: ["DK"],
    },
    phone_number_collection: { enabled: true },
  });

  if (!session.url) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Noget gik galt</h1>
          <p className="text-stone-500">Vi kunne ikke oprette en betalingssession. Prøv igen.</p>
          <a href="/" className="inline-block mt-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110">
            Tilbage til forsiden
          </a>
        </div>
      </div>
    );
  }

  // Gem den nye Stripe-session. recovery_status sættes til "recovered" først,
  // når betalingen er gennemført (handleCheckoutCompleted).
  await supabase
    .from("orders")
    .update({
      stripe_checkout_session_id: session.id,
      status: "pending",
    })
    .eq("id", order.id);

  redirect(session.url);
}
