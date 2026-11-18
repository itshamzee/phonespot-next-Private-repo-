import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { statViewer } from "@/lib/admin/statistik/access";
import { firstOrderDate, loadStatistik } from "@/lib/admin/statistik/load";
import { parseStatQuery } from "@/lib/admin/statistik/range";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { RefreshOnMount } from "@/components/admin/overview/refresh-on-mount";
import { StatistikView } from "@/components/admin/statistik/statistik-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Statistik" };

type Query = { periode?: string | string[]; fra?: string | string[]; til?: string | string[]; butik?: string | string[]; vis?: string | string[] };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Statistik: hele forretningens tal for en periode. Adgang og butik afgøres her
 * på serveren via statViewer; ?butik= bruges kun af ejeren (statViewer ignorerer
 * det for alle andre), og ejer-tallene er skåret fra payloaden for andre.
 */
export default async function StatistikPage({ searchParams }: { searchParams: Promise<Query> }) {
  const ctx = await staffScopeForPage();
  if (!ctx) return <RefreshOnMount />;

  const q = await searchParams;
  const viewer = statViewer(ctx.staff, ctx.scope, one(q.butik));
  if (!viewer) redirect("/admin");

  const now = new Date();
  const minDate = await firstOrderDate();
  const range = parseStatQuery({ periode: one(q.periode), fra: one(q.fra), til: one(q.til) }, now, minDate);
  const payload = await loadStatistik(viewer, range, now);
  const metric = viewer.isOwner && one(q.vis) === "fortjeneste" ? "fortjeneste" : "omsaetning";

  return <StatistikView payload={payload} metric={metric} today={copenhagenDateString(now)} />;
}
