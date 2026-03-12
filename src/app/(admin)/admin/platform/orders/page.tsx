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
    .select("*, customer:customers(name, email, phone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  if (status)     query = query.eq("status", status);
  if (type)       query = query.eq("type", type);
  if (locationId) query = query.eq("location_id", locationId);
  if (from)       query = query.gte("created_at", from);
  if (to)         query = query.lte("created_at", to + "T23:59:59Z");

  const { data, count } = await query;

  const initialOrders = data ?? [];
  const initialTotal  = count ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Ordrer</h1>
        <p className="mt-1 text-sm text-stone-400">
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
