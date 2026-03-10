import { NextResponse } from "next/server";
import { createGSCClient } from "@/lib/google-search-console";
import { createServerClient } from "@/lib/supabase/client";

function getSyncDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 3); // GSC data typically available 2-3 days after
  return d.toISOString().split("T")[0];
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: sites } = await supabase
    .from("seo_sites")
    .select("*")
    .eq("is_active", true);

  if (!sites || sites.length === 0) {
    return NextResponse.json({ message: "No active sites" });
  }

  const date = getSyncDate();
  const results = [];

  for (const site of sites) {
    const { data: logEntry } = await supabase
      .from("seo_sync_log")
      .insert({
        site_id: site.id,
        status: "success",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      const credentialsJson = process.env[site.gsc_credentials_env];
      if (!credentialsJson) {
        throw new Error(`Missing env var: ${site.gsc_credentials_env}`);
      }

      const gsc = createGSCClient(credentialsJson, site.gsc_property);

      // Fetch keywords
      const keywords = await gsc.fetchKeywords(date, date);

      // Delete existing data for this date to avoid duplicates
      await supabase
        .from("seo_keywords")
        .delete()
        .eq("site_id", site.id)
        .eq("date", date);

      // Insert keyword rows in batches of 500
      for (let i = 0; i < keywords.length; i += 500) {
        const batch = keywords.slice(i, i + 500).map((kw) => ({
          site_id: site.id,
          date,
          query: kw.query,
          page: kw.page,
          clicks: kw.clicks,
          impressions: kw.impressions,
          ctr: kw.ctr,
          position: kw.position,
        }));
        await supabase.from("seo_keywords").insert(batch);
      }

      // Fetch pages
      const pages = await gsc.fetchPages(date, date);

      await supabase
        .from("seo_pages")
        .delete()
        .eq("site_id", site.id)
        .eq("date", date);

      // Find top query per page from keyword data
      const topQueryMap = new Map<string, string>();
      for (const kw of keywords) {
        if (!topQueryMap.has(kw.page)) {
          topQueryMap.set(kw.page, kw.query);
        }
      }

      for (let i = 0; i < pages.length; i += 500) {
        const batch = pages.slice(i, i + 500).map((pg) => ({
          site_id: site.id,
          date,
          page: pg.page,
          clicks: pg.clicks,
          impressions: pg.impressions,
          ctr: pg.ctr,
          position: pg.position,
          top_query: topQueryMap.get(pg.page) ?? null,
        }));
        await supabase.from("seo_pages").insert(batch);
      }

      // Update sync log
      await supabase
        .from("seo_sync_log")
        .update({
          status: "success",
          keywords_synced: keywords.length,
          pages_synced: pages.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry!.id);

      results.push({
        site: site.name,
        status: "success",
        keywords: keywords.length,
        pages: pages.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("seo_sync_log")
        .update({
          status: "error",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry!.id);

      results.push({ site: site.name, status: "error", error: message });
    }
  }

  return NextResponse.json({ results });
}
