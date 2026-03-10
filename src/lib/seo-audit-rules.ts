import type { AuditIssue } from "@/lib/supabase/types";

export function calculateScore(issues: AuditIssue[]): number {
  const deductions = { high: 20, medium: 10, low: 5 };
  return Math.max(
    0,
    100 - issues.reduce((sum, i) => sum + deductions[i.severity], 0)
  );
}

/** Detect keyword cannibalization: multiple pages ranking for same query */
export function findCannibalization(
  keywords: { query: string; page: string }[]
): Map<string, Set<string>> {
  const queryPages = new Map<string, Set<string>>();
  for (const kw of keywords) {
    if (!queryPages.has(kw.query)) queryPages.set(kw.query, new Set());
    queryPages.get(kw.query)!.add(kw.page);
  }

  // Only keep queries that appear on multiple pages
  const cannibalizing = new Map<string, Set<string>>();
  for (const [query, pages] of queryPages) {
    if (pages.size > 1) cannibalizing.set(query, pages);
  }
  return cannibalizing;
}

/** Detect position drops: position dropped >5 places vs previous period */
export function findPositionDrops(
  current: { query: string; page: string; position: number }[],
  previous: { query: string; position: number }[]
): { query: string; page: string; currentPos: number; drop: number }[] {
  const prevMap = new Map<string, number>();
  for (const kw of previous) {
    const existing = prevMap.get(kw.query);
    if (!existing || kw.position < existing) {
      prevMap.set(kw.query, kw.position);
    }
  }

  const drops: {
    query: string;
    page: string;
    currentPos: number;
    drop: number;
  }[] = [];
  const seen = new Set<string>();
  for (const kw of current) {
    if (seen.has(kw.query)) continue;
    seen.add(kw.query);

    const prevPos = prevMap.get(kw.query);
    if (prevPos !== undefined) {
      const drop = kw.position - prevPos; // positive = dropped (worse)
      if (drop > 5) {
        drops.push({
          query: kw.query,
          page: kw.page,
          currentPos: kw.position,
          drop,
        });
      }
    }
  }
  return drops;
}

/** Detect low CTR anomalies: CTR significantly below average for position range */
export function findLowCTR(
  keywords: {
    query: string;
    page: string;
    position: number;
    ctr: number;
    impressions: number;
  }[]
): { query: string; page: string; ctr: number; expectedCtr: number }[] {
  // Expected CTR benchmarks by position (rough industry averages)
  function expectedCtrForPosition(pos: number): number {
    if (pos <= 1) return 0.28;
    if (pos <= 2) return 0.15;
    if (pos <= 3) return 0.11;
    if (pos <= 5) return 0.06;
    if (pos <= 10) return 0.025;
    return 0.01;
  }

  const anomalies: {
    query: string;
    page: string;
    ctr: number;
    expectedCtr: number;
  }[] = [];
  for (const kw of keywords) {
    if (kw.impressions < 50) continue; // Skip low-volume queries
    const expected = expectedCtrForPosition(kw.position);
    if (kw.ctr < expected * 0.4) {
      // CTR is less than 40% of expected
      anomalies.push({
        query: kw.query,
        page: kw.page,
        ctr: kw.ctr,
        expectedCtr: expected,
      });
    }
  }
  return anomalies;
}
