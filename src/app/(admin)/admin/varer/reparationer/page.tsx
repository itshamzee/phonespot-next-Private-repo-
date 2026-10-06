import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { loadManageTree } from "@/lib/repairs/catalog-manage";
import { canSeeCost } from "@/lib/stock/rules";
import { VarerTabs } from "@/components/admin/varer/varer-tabs";
import { CatalogManager } from "@/components/admin/repair-catalog/catalog-manager";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Varer, Reparationer: modeller, priser og reservedele i ét billede. Hjemmesiden læser aktive modeller og
 * reparationer direkte, så alt her er live på phonespot.dk, når det er aktivt.
 * ?model=<id> åbner en bestemt model (bruges af de gamle prislistelinks).
 */
export default async function ReparationerKatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await staffScopeForPage();
  if (!auth) return <p className="text-[15px] text-[#5E6A63]">Log ind som personale for at se reparationerne.</p>;
  if (!canSeeCost(auth.staff)) {
    return <p className="text-[15px] text-[#5E6A63]">Kun ejere og managere kan redigere reparationskataloget.</p>;
  }

  const params = await searchParams;
  const rawModel = Array.isArray(params.model) ? params.model[0] : params.model;
  const modelId = rawModel && uuidRe.test(rawModel) ? rawModel : null;

  const tree = await loadManageTree().catch((err) => {
    console.error("[varer/reparationer] tree failed:", err);
    return null;
  });

  return (
    <div className="flex flex-col gap-5 text-[#15211B]">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">Reparationer</h1>
        <p className="max-w-[72ch] text-[14px] text-[#5E6A63]">
          Modeller, priser og reservedele samlet ét sted. Det der er aktivt, vises på hjemmesiden og kan vælges i Ny sag med det samme.
        </p>
      </div>
      <VarerTabs active="reparationer" canManageRepairs />
      {tree ? (
        <CatalogManager initialTree={tree} initialModelId={modelId} />
      ) : (
        <p className="rounded-lg border border-[#E9C9A0] bg-[#FBF1DF] px-4 py-3 text-[14px] text-[#9A5B0A]">
          Kataloget kunne ikke hentes. Prøv at genindlæse siden.
        </p>
      )}
    </div>
  );
}
