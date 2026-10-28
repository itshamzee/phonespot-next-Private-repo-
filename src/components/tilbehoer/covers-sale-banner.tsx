import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

/** Henviser til /covers-udsalg, men kun når der faktisk er covers på udsalg. */
export async function CoversSaleBanner() {
  let count = 0;
  let minKr: number | null = null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("checkout_sku_inventory")
      .select("selling_price, sale_price, total_stock, always_in_stock")
      .eq("status", "published")
      .eq("is_active", true)
      .eq("subcategory", "cover")
      .eq("attributes->>udsalg", "Ja")
      .limit(2000);
    const live = (data ?? []).filter((r) => (r.total_stock ?? 0) > 0 || r.always_in_stock);
    count = live.length;
    if (count) minKr = Math.min(...live.map((r) => r.sale_price ?? r.selling_price)) / 100;
  } catch {
    return null;
  }
  if (!count) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-4 sm:px-9">
      <Link
        href="/covers-udsalg"
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl bg-[#1A3D2E] px-5 py-4 text-white transition-colors hover:bg-[#244f3c]"
      >
        <span className="text-base font-semibold md:text-lg">Covers-udsalg: lagerrydning fra {minKr} kr.</span>
        <span className="text-sm text-white/80 underline underline-offset-4">Se covers til din telefon</span>
      </Link>
    </div>
  );
}
