import { isLagersystemEnabled } from "@/lib/lagersystem/config";
import { SparePartsStock } from "@/components/admin/lager/spare-parts-stock";

export const dynamic = "force-dynamic";

/** Spec §4.3. Data hentes via de beskyttede /api/admin/lager-ruter, ikke her. */
export default async function SparePartsStockPage({ searchParams }: { searchParams: Promise<{ fane?: string }> }) {
  if (!isLagersystemEnabled()) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-soft-grey bg-white p-6">
        <h1 className="text-xl font-bold tracking-[-0.01em] text-charcoal">Lagersystemet er ikke forbundet</h1>
        <p className="mt-2 text-sm text-gray">Reservedele styres i det fælles lagersystem. Siden bliver aktiv, når forbindelsen er sat op.</p>
      </div>
    );
  }
  const { fane } = await searchParams;
  return <SparePartsStock initialTab={fane === "flytninger" ? "flytninger" : "saldi"} />;
}
