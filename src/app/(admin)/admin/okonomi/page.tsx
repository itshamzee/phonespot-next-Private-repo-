import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { isOwner } from "@/lib/auth/store-scope";
import { loadOverview } from "@/lib/admin/overview/load";
import { OKONOMI_PERIODS, parsePeriod } from "@/lib/admin/overview/period";
import { AllStoresOverviewView } from "@/components/admin/overview/all-stores-overview";
import { RefreshOnMount } from "@/components/admin/overview/refresh-on-mount";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Økonomi" };

/** Økonomi (kun ejeren): samme opgørelse som Alle butikker, med måned, kvartal og år. Følger ikke butiksvalget. */
export default async function AdminOkonomiPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const ctx = await staffScopeForPage();
  if (!ctx) return <RefreshOnMount />;
  if (!isOwner(ctx.staff)) redirect("/admin");

  const { periode } = await searchParams;
  const period = parsePeriod(periode, OKONOMI_PERIODS, "maaned");
  const data = await loadOverview({ scope: "alle", isOwner: true }, period);
  if (data.kind !== "alle") redirect("/admin");

  return <AllStoresOverviewView data={data} title="Økonomi" periods={OKONOMI_PERIODS} basePath="/admin/okonomi" />;
}
