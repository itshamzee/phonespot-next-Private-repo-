import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  calculateScore,
  findCannibalization,
  findPositionDrops,
  findLowCTR,
} from "@/lib/seo-audit-rules";
import type { AuditIssue } from "@/lib/supabase/types";

export async function POST(request: Request) {
  const supabase = createServerClient();

  const { site_id } = await request.json();
  if (!site_id) {
    return NextResponse.json({ error: "Missing site_id" }, { status: 400 });
  }

  const { data: site } = await supabase
    .from("seo_sites")
    .select("*")
    .eq("id", site_id)
    .single();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Clear existing audits for this site
  await supabase.from("seo_content_audits").delete().eq("site_id", site_id);

  const audits: {
    site_id: string;
    page_path: string;
    content_type: string;
    content_id: string | null;
    score: number;
    issues: AuditIssue[];
    recommendations: string[];
    last_audited: string;
  }[] = [];

  // Fetch recent keywords (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: keywords } = await supabase
    .from("seo_keywords")
    .select("query, page, position, ctr, impressions, clicks")
    .eq("site_id", site_id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false })
    .limit(10000);

  const kws = keywords ?? [];

  // Fetch previous period keywords (30-60 days ago)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: prevKeywords } = await supabase
    .from("seo_keywords")
    .select("query, position")
    .eq("site_id", site_id)
    .gte("date", sixtyDaysAgo.toISOString().split("T")[0])
    .lt("date", thirtyDaysAgo.toISOString().split("T")[0])
    .limit(10000);

  // 1. Keyword cannibalization
  const cannibalization = findCannibalization(kws);
  for (const [query, pages] of cannibalization) {
    for (const page of pages) {
      const existing = audits.find((a) => a.page_path === page);
      const issue: AuditIssue = {
        type: "keyword_cannibalization",
        severity: "medium",
        message: `Keyword kannibalisering: "${query}" ranker på ${pages.size} sider`,
      };
      const rec = `Konsolider indhold for "${query}" til én primær side`;

      if (existing) {
        existing.issues.push(issue);
        existing.recommendations.push(rec);
        existing.score = calculateScore(existing.issues);
      } else {
        audits.push({
          site_id,
          page_path: page,
          content_type: "external",
          content_id: null,
          score: calculateScore([issue]),
          issues: [issue],
          recommendations: [rec],
          last_audited: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Position drops
  const drops = findPositionDrops(kws, prevKeywords ?? []);
  for (const drop of drops) {
    const existing = audits.find((a) => a.page_path === drop.page);
    const issue: AuditIssue = {
      type: "position_drop",
      severity: "high",
      message: `Position faldet: "${drop.query}" er faldet ${drop.drop.toFixed(1)} pladser (nu pos. ${drop.currentPos.toFixed(1)})`,
    };
    const rec = `Undersøg hvorfor "${drop.query}" er faldet og optimér indholdet`;

    if (existing) {
      existing.issues.push(issue);
      existing.recommendations.push(rec);
      existing.score = calculateScore(existing.issues);
    } else {
      audits.push({
        site_id,
        page_path: drop.page,
        content_type: "external",
        content_id: null,
        score: calculateScore([issue]),
        issues: [issue],
        recommendations: [rec],
        last_audited: new Date().toISOString(),
      });
    }
  }

  // 3. Low CTR anomalies
  const lowCtr = findLowCTR(kws);
  for (const anomaly of lowCtr) {
    const existing = audits.find((a) => a.page_path === anomaly.page);
    const issue: AuditIssue = {
      type: "low_ctr",
      severity: "medium",
      message: `Lav CTR: "${anomaly.query}" har ${(anomaly.ctr * 100).toFixed(1)}% CTR (forventet ~${(anomaly.expectedCtr * 100).toFixed(0)}%)`,
    };
    const rec = `Optimér title tag og meta description for "${anomaly.query}" for at øge CTR`;

    if (existing) {
      existing.issues.push(issue);
      existing.recommendations.push(rec);
      existing.score = calculateScore(existing.issues);
    } else {
      audits.push({
        site_id,
        page_path: anomaly.page,
        content_type: "external",
        content_id: null,
        score: calculateScore([issue]),
        issues: [issue],
        recommendations: [rec],
        last_audited: new Date().toISOString(),
      });
    }
  }

  // Insert all audits in batches
  for (let i = 0; i < audits.length; i += 500) {
    await supabase
      .from("seo_content_audits")
      .insert(audits.slice(i, i + 500));
  }

  return NextResponse.json({ audited: audits.length });
}
