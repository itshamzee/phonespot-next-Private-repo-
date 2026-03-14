import { createAdminClient } from "@/lib/supabase/admin";
import { OrderList } from "@/components/admin/orders/order-list";

const PER_PAGE = 25;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const status     = typeof params.status   === "string" ? params.status   : undefined;
  const type       = typeof params.type     === "string" ? params.type     : undefined;
  const from       = typeof params.from     === "string" ? params.from     : undefined;
  const to         = typeof params.to       === "string" ? params.to       : undefined;
  const locationId = typeof params.location === "string" ? params.location : undefined;
  const page       = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10));

  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, type, total_amount, created_at, location_id, customer:customers(name, email, phone)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  if (status)     query = query.eq("status", status);
  if (type)       query = query.eq("type", type);
  if (locationId) query = query.eq("location_id", locationId);
  if (from)       query = query.gte("created_at", from);
  if (to)         query = query.lte("created_at", to + "T23:59:59Z");

  const { data, count } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialOrders = (data ?? []).map((row: any) => ({
    ...row,
    customer: Array.isArray(row.customer) ? (row.customer[0] ?? null) : (row.customer ?? null),
  }));
  const initialTotal = count ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Ordrer
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          Overblik over alle online- og POS-ordrer
        </p>
      </div>

      <OrderList
        initialOrders={initialOrders}
        initialTotal={initialTotal}
        initialPage={page}
      />
    </div>
  );
}
