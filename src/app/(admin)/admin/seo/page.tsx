"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { SiteSelector } from "@/components/admin/seo/SiteSelector";
import { SEOKPICards } from "@/components/admin/seo/SEOKPICards";
import { KeywordTrendChart } from "@/components/admin/seo/KeywordTrendChart";
import type { TrendDay } from "@/components/admin/seo/KeywordTrendChart";
import { KeywordTable } from "@/components/admin/seo/KeywordTable";
import type { KeywordTableRow } from "@/components/admin/seo/KeywordTable";
import { ContentAuditPanel } from "@/components/admin/seo/ContentAuditPanel";
import type { SeoSite, SeoContentAudit } from "@/lib/supabase/types";

type Tab = "keywords" | "pages" | "audit";
type DateRange = "7d" | "30d" | "90d";

const TABS: { key: Tab; label: string }[] = [
  { key: "keywords", label: "Sogeord" },
  { key: "pages", label: "Sider" },
  { key: "audit", label: "Content Audit" },
];

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: "7d", label: "7 dage" },
  { key: "30d", label: "30 dage" },
  { key: "90d", label: "90 dage" },
];

function getRangeStart(range: DateRange): string {
  const d = new Date();
  d.setDate(d.getDate() - (range === "7d" ? 7 : range === "30d" ? 30 : 90));
  return d.toISOString().split("T")[0];
}

export default function SEOPage() {
  const [site, setSite] = useState<SeoSite | null>(null);
  const [tab, setTab] = useState<Tab>("keywords");
  const [range, setRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);

  // KPI data
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [avgPosition, setAvgPosition] = useState(0);
  const [avgCTR, setAvgCTR] = useState(0);

  // Keyword data
  const [trendData, setTrendData] = useState<TrendDay[]>([]);
  const [keywordRows, setKeywordRows] = useState<KeywordTableRow[]>([]);

  // Page data
  const [pageRows, setPageRows] = useState<
    {
      page: string;
      clicks: number;
      impressions: number;
      position: number;
      topQuery: string | null;
    }[]
  >([]);

  // Audit data
  const [audits, setAudits] = useState<SeoContentAudit[]>([]);
  const [auditing, setAuditing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!site) return;
    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const rangeStart = getRangeStart(range);
      const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;

      // Previous period for comparison
      const prevStart = new Date();
      prevStart.setDate(prevStart.getDate() - rangeDays * 2);
      const prevEnd = new Date();
      prevEnd.setDate(prevEnd.getDate() - rangeDays);

      // Fetch keywords for current period
      const { data: keywords } = await supabase
        .from("seo_keywords")
        .select("*")
        .eq("site_id", site.id)
        .gte("date", rangeStart)
        .order("date", { ascending: true });

      const kws = keywords ?? [];

      // Fetch keywords for previous period (for position comparison)
      const { data: prevKeywords } = await supabase
        .from("seo_keywords")
        .select("query, position")
        .eq("site_id", site.id)
        .gte("date", prevStart.toISOString().split("T")[0])
        .lt("date", prevEnd.toISOString().split("T")[0]);

      // Build previous position map
      const prevPositions = new Map<string, number[]>();
      for (const pk of prevKeywords ?? []) {
        if (!prevPositions.has(pk.query)) prevPositions.set(pk.query, []);
        prevPositions.get(pk.query)!.push(pk.position);
      }
      const prevAvgPositions = new Map<string, number>();
      for (const [q, positions] of prevPositions) {
        prevAvgPositions.set(
          q,
          positions.reduce((a, b) => a + b, 0) / positions.length
        );
      }

      // KPIs
      const totClicks = kws.reduce((s, k) => s + k.clicks, 0);
      const totImpressions = kws.reduce((s, k) => s + k.impressions, 0);
      setTotalClicks(totClicks);
      setTotalImpressions(totImpressions);

      // Aggregate by query for avg position and CTR
      const queryAgg = new Map<
        string,
        {
          clicks: number;
          impressions: number;
          positionSum: number;
          count: number;
        }
      >();
      for (const kw of kws) {
        const existing = queryAgg.get(kw.query);
        if (existing) {
          existing.clicks += kw.clicks;
          existing.impressions += kw.impressions;
          existing.positionSum += kw.position;
          existing.count++;
        } else {
          queryAgg.set(kw.query, {
            clicks: kw.clicks,
            impressions: kw.impressions,
            positionSum: kw.position,
            count: 1,
          });
        }
      }

      const queryRows: KeywordTableRow[] = [];
      let totalPos = 0;
      let totalCtr = 0;
      let ctrCount = 0;

      for (const [query, agg] of queryAgg) {
        const avgPos = agg.positionSum / agg.count;
        const ctr = agg.impressions > 0 ? agg.clicks / agg.impressions : 0;
        const prevPos = prevAvgPositions.get(query);
        const posChange =
          prevPos !== undefined ? prevPos - avgPos : null; // positive = improved

        queryRows.push({
          query,
          clicks: agg.clicks,
          impressions: agg.impressions,
          ctr,
          position: avgPos,
          positionChange: posChange,
        });

        totalPos += avgPos;
        totalCtr += ctr;
        ctrCount++;
      }

      setAvgPosition(ctrCount > 0 ? totalPos / ctrCount : 0);
      setAvgCTR(ctrCount > 0 ? totalCtr / ctrCount : 0);
      setKeywordRows(queryRows);

      // Trend data: aggregate by date
      const dateMap = new Map<string, { clicks: number; impressions: number }>();
      for (const kw of kws) {
        const existing = dateMap.get(kw.date);
        if (existing) {
          existing.clicks += kw.clicks;
          existing.impressions += kw.impressions;
        } else {
          dateMap.set(kw.date, {
            clicks: kw.clicks,
            impressions: kw.impressions,
          });
        }
      }
      const trend: TrendDay[] = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, ...vals }));
      setTrendData(trend);

      // Fetch pages
      const { data: pages } = await supabase
        .from("seo_pages")
        .select("*")
        .eq("site_id", site.id)
        .gte("date", rangeStart);

      // Aggregate pages
      const pageAgg = new Map<
        string,
        {
          clicks: number;
          impressions: number;
          positionSum: number;
          count: number;
          topQuery: string | null;
        }
      >();
      for (const pg of pages ?? []) {
        const existing = pageAgg.get(pg.page);
        if (existing) {
          existing.clicks += pg.clicks;
          existing.impressions += pg.impressions;
          existing.positionSum += pg.position;
          existing.count++;
          if (!existing.topQuery) existing.topQuery = pg.top_query;
        } else {
          pageAgg.set(pg.page, {
            clicks: pg.clicks,
            impressions: pg.impressions,
            positionSum: pg.position,
            count: 1,
            topQuery: pg.top_query,
          });
        }
      }

      setPageRows(
        Array.from(pageAgg.entries())
          .map(([page, agg]) => ({
            page,
            clicks: agg.clicks,
            impressions: agg.impressions,
            position: agg.positionSum / agg.count,
            topQuery: agg.topQuery,
          }))
          .sort((a, b) => b.clicks - a.clicks)
      );

      // Fetch audits
      const { data: auditData } = await supabase
        .from("seo_content_audits")
        .select("*")
        .eq("site_id", site.id);
      setAudits((auditData ?? []) as SeoContentAudit[]);
    } catch (err) {
      console.error("SEO data load error:", err);
    }

    setLoading(false);
  }, [site, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function runAudit() {
    if (!site) return;
    setAuditing(true);
    try {
      await fetch("/api/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id }),
      });
      // Refresh audit data
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("seo_content_audits")
        .select("*")
        .eq("site_id", site.id);
      setAudits((data ?? []) as SeoContentAudit[]);
    } catch (err) {
      console.error("Audit error:", err);
    }
    setAuditing(false);
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-100">
            SEO Analytics
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sogeords-tracking &amp; performance
          </p>
        </div>
        <SiteSelector onSiteChange={setSite} />
      </div>

      {/* Tabs + Date Range */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-amber-500/10 text-amber-500 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        {tab !== "audit" && (
          <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {DATE_RANGES.map((dr) => (
              <button
                key={dr.key}
                onClick={() => setRange(dr.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  range === dr.key
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No site selected */}
      {!site && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900 px-5 py-16 text-center">
          <svg
            className="mx-auto mb-3 h-8 w-8 text-zinc-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="text-sm text-zinc-500">
            Vaelg et site for at se SEO-data.
          </p>
        </div>
      )}

      {/* Keywords tab */}
      {site && tab === "keywords" && (
        <div className="space-y-4">
          <SEOKPICards
            totalClicks={totalClicks}
            totalImpressions={totalImpressions}
            avgPosition={avgPosition}
            avgCTR={avgCTR}
            loading={loading}
          />
          <KeywordTrendChart data={trendData} loading={loading} />
          <KeywordTable rows={keywordRows} loading={loading} />
        </div>
      )}

      {/* Pages tab */}
      {site && tab === "pages" && (
        <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900">
          <div className="border-b border-zinc-800/50 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-zinc-200">
              Side-performance
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
                <p className="text-sm text-zinc-600">Indlaeser...</p>
              </div>
            </div>
          ) : pageRows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-zinc-600">
              Ingen sidedata endnu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Side
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Klik
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Visninger
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Gns. position
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Top sogeord
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.slice(0, 50).map((row, i) => {
                    // Shorten URL for display
                    let displayUrl = row.page;
                    try {
                      const url = new URL(row.page);
                      displayUrl = url.pathname;
                    } catch {
                      // Use as-is
                    }

                    return (
                      <tr
                        key={i}
                        className="border-b border-zinc-800/30 last:border-0 transition-colors hover:bg-zinc-800/30"
                      >
                        <td
                          className="max-w-[350px] truncate px-4 py-2.5 font-mono text-xs text-zinc-300"
                          title={row.page}
                        >
                          {displayUrl}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-zinc-300">
                          {row.clicks}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-zinc-300">
                          {row.impressions.toLocaleString("da-DK")}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-zinc-300">
                          {row.position.toFixed(1)}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-2.5 text-zinc-400">
                          {row.topQuery ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content Audit tab */}
      {site && tab === "audit" && (
        <ContentAuditPanel
          audits={audits}
          loading={loading}
          onRunAudit={runAudit}
          auditing={auditing}
        />
      )}
    </div>
  );
}
