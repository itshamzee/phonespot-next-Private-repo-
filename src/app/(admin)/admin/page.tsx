import type { Metadata } from "next";
import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { isOwner } from "@/lib/auth/store-scope";
import { loadOverview } from "@/lib/admin/overview/load";
import { OVERBLIK_PERIODS, parsePeriod } from "@/lib/admin/overview/period";
import { AllStoresOverviewView } from "@/components/admin/overview/all-stores-overview";
import { RefreshOnMount } from "@/components/admin/overview/refresh-on-mount";
import { StoreOverviewView } from "@/components/admin/overview/store-overview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overblik" };

/**
 * Overblik: for én butik (medarbejdere altid deres egen, ejeren den valgte) eller
 * ejerens samlede "Alle butikker". Alt hentes og afgrænses på serveren.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const ctx = await staffScopeForPage();
  if (!ctx) return <RefreshOnMount />;

  const { periode } = await searchParams;
  const period = parsePeriod(periode, OVERBLIK_PERIODS, ctx.scope === "alle" ? "uge" : "dag");
  const data = await loadOverview({ scope: ctx.scope, isOwner: isOwner(ctx.staff) }, period);

  return data.kind === "alle" ? (
    <AllStoresOverviewView data={data} periods={OVERBLIK_PERIODS} basePath="/admin" />
  ) : (
    <StoreOverviewView data={data} />
  );
}
