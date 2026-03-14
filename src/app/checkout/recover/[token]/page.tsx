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
      "id, order_number, status, recovery_status, total, shipping_cost, shipping_method, customer:customers(name, email, phone), order_items(id, item_type, device_id, sku_product_id, quantity, unit_price)"
    )
    .eq("recovery_token", token)
    .single();

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-bold text-stone-800">Link ugyldig eller udløbet</h1>
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

  // Already recovered
  if (order.recovery_status === "recovered") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-stone-800">Denne ordre er allerede genoptaget</h1>
          <p className="text-stone-500">
            Din ordre #{order.order_number} er allerede blevet betalt eller genoptaget.
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
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-bold text-stone-800">Link ugyldig eller udløbet</h1>
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
  const deviceItems = orderItems.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => item.item_type === "device" && item.device_id
  );

  // Check that all devices are still available (listed or reserved but expired)
  const unavailableDevices: string[] = [];
  for (const item of deviceItems) {
    const { data: device } = await supabase
      .from("devices")
      .select("id, status, reservation_expires_at")
      .eq("id", item.device_id)
      .single();

    if (!device) {
      unavailableDevices.push(item.device_id);
      continue;
    }

    const isListed = device.status === "listed";
    const isExpiredReservation =
      device.status === "reserved" &&
      device.reservation_expires_at &&
      new Date(device.reservation_expires_at) < new Date();

    if (!isListed && !isExpiredReservation) {
      unavailableDevices.push(item.device_id);
    }
  }

  if (unavailableDevices.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">😔</div>
          <h1 className="text-2xl font-bold text-stone-800">Varen er desværre ikke længere tilgængelig</h1>
          <p className="text-stone-500">
            En eller flere varer i din kurv er solgt siden du forlod checkout. Du er velkommen til at se vores
            øvrige lager.
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

  // Re-reserve all devices (15 min TTL)
  const reservationExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  for (const item of deviceItems) {
    await supabase
      .from("devices")
      .update({ status: "reserved", reservation_expires_at: reservationExpires })
      .eq("id", item.device_id);
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
        .select("sku, color, storage, grade, product_templates(name)")
        .eq("id", item.device_id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const template: any = device
        ? Array.isArray(device.product_templates)
          ? device.product_templates[0]
          : device.product_templates
        : null;

      const name = device
        ? `${template?.name ?? "Enhed"} — Grade ${device.grade} (${device.storage}, ${device.color})`
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
        .select("name")
        .eq("id", item.sku_product_id)
        .single();

      lineItems.push({
        price_data: {
          currency: "dkk",
          product_data: { name: skuProduct?.name ?? "Produkt" },
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

  // Update order recovery_status to 'recovered' and store new Stripe session
  await supabase
    .from("orders")
    .update({
      recovery_status: "recovered",
      stripe_checkout_session_id: session.id,
      status: "pending",
    })
    .eq("id", order.id);

  redirect(session.url);
}
