import Link from "next/link";
import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { SCOPE_LABELS } from "@/lib/auth/store-scope";
import { loadSalesPage } from "@/lib/pos/sales-history-data";
import { parseSalesFilters } from "@/lib/pos/sales-history";
import { SalesFilterBar, SalesPager, SalesTable, SalesTotalsCard, periodTitle } from "./_components/sales-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salgshistorik" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Salgshistorik: kun kassesalg (orders.type = 'pos') for den valgte butik. Webshop-ordrer
 * bor under /admin/platform/orders. Data læses på serveren med service-role-klienten.
 */
export default async function SalgshistorikPage({ searchParams }: PageProps) {
  const filters = parseSalesFilters(await searchParams);
  const auth = await staffScopeForPage();
  const scope = auth?.scope ?? "ingen";
  const locations = await loadLocationIndex();
  const data = await loadSalesPage({ scope, locations, filters });

  const filtered = !!(filters.q || filters.payment);
  const title = `${periodTitle(filters, data.fromDate, data.toDate)}${filtered ? " (filtreret)" : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">Salgshistorik</h2>
          <p className="mt-0.5 text-sm text-charcoal/40">
            Salg fra kassen · {SCOPE_LABELS[scope]}
          </p>
        </div>
        <Link href="/admin/kasse" className="text-sm font-semibold text-[#1A3D2E] hover:text-[#2D6B45]">
          Tilbage til kassen
        </Link>
      </div>

      <SalesFilterBar filters={filters} />
      <SalesTotalsCard totals={data.totals} title={title} />
      <SalesTable
        rows={data.rows}
        empty={filtered ? "Ingen salg matcher søgningen" : "Ingen kassesalg i perioden"}
      />
      <SalesPager filters={filters} page={data.page} pages={data.pages} matching={data.matching} />
    </div>
  );
}
