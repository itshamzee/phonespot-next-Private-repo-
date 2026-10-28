import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

/** Henviser til /lagersalg, men kun når der faktisk er covers på lagersalg. */
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
        href="/lagersalg"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-[#1A3D2E] px-5 py-5 text-white transition-colors hover:bg-[#244f3c] md:px-7"
      >
        <span>
          <span className="block font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">Covers på lagersalg</span>
          <span className="mt-1 block text-sm text-white/75">{count} nye covers til iPhone og Samsung. Find din model.</span>
        </span>
        <span className="rounded-md bg-[#FFE27A] px-3 py-1.5 font-display text-xl font-bold text-charcoal">fra {minKr} kr.</span>
      </Link>
    </div>
  );
}
