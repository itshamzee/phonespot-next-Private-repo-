import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrderDetail } from "@/components/admin/orders/order-detail";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", id)
    .single();

  return {
    title: data?.order_number ? `Ordre ${data.order_number}` : "Ordre",
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(*),
      items:order_items(
        *,
        device:devices(*, template:product_templates(display_name, brand, model)),
        sku_product:sku_products(title, images)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("entity_type", "order")
    .eq("entity_id", id)
    .order("created_at", { ascending: false });

  const { data: warranties } = await supabase
    .from("warranties")
    .select(`
      id,
      guarantee_number,
      status,
      pdf_url,
      issued_at,
      expires_at,
      qr_verification_code,
      devices (
        product_templates ( display_name )
      )
    `)
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  return <OrderDetail order={order} activity={activity ?? []} warranties={warranties ?? []} />;
}
