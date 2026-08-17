import { createAdminClient } from "@/lib/supabase/admin";
import { UpgradeOptionsManager } from "@/components/platform/upgrade-options-manager";

export const metadata = { title: "Opgraderinger" };

export default async function UpgradesPage() {
  const supabase = createAdminClient();
  const [{ data: options }, { data: templates }, { data: links }] = await Promise.all([
    supabase.from("laptop_upgrade_options").select("*").order("kind").order("sort_order"),
    supabase
      .from("product_templates")
      .select("id, display_name, brand, model")
      .eq("category", "laptop")
      .order("display_name"),
    supabase.from("template_upgrade_options").select("template_id, upgrade_option_id"),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Opgraderinger
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          Prisliste for RAM/SSD-opgraderinger og hvilke laptop-modeller de tilbydes på
        </p>
      </div>
      <UpgradeOptionsManager
        initialOptions={options ?? []}
        templates={templates ?? []}
        initialLinks={links ?? []}
      />
    </div>
  );
}
