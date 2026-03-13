"use client";

import type { SeoContentAudit, IssueSeverity } from "@/lib/supabase/types";

interface ContentAuditPanelProps {
  audits: SeoContentAudit[];
  loading: boolean;
  onRunAudit: () => void;
  auditing: boolean;
}

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { label: string; color: string; dotColor: string; bg: string }
> = {
  high: {
    label: "Hoej",
    color: "text-rose-600",
    dotColor: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]",
    bg: "bg-rose-50",
  },
  medium: {
    label: "Medium",
    color: "text-amber-600",
    dotColor: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]",
    bg: "bg-amber-50",
  },
  low: {
    label: "Lav",
    color: "text-blue-600",
    dotColor: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]",
    bg: "bg-blue-50",
  },
};

export function ContentAuditPanel({
  audits,
  loading,
  onRunAudit,
  auditing,
}: ContentAuditPanelProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-200/60 bg-white p-5">
        <h3 className="text-sm font-semibold text-charcoal">Content Audit</h3>
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-green-eco" />
            <p className="text-sm text-stone-400">Indlaeser...</p>
          </div>
        </div>
      </div>
    );
  }

  const avgScore =
    audits.length > 0
      ? Math.round(
          audits.reduce((sum, a) => sum + a.score, 0) / audits.length
        )
      : 0;

  const allIssues = audits.flatMap((a) =>
    a.issues.map((issue) => ({
      ...issue,
      pagePath: a.page_path,
      contentType: a.content_type,
    }))
  );

  const highIssues = allIssues.filter((i) => i.severity === "high");
  const mediumIssues = allIssues.filter((i) => i.severity === "medium");
  const lowIssues = allIssues.filter((i) => i.severity === "low");

  function scoreColor(score: number) {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-rose-600";
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="overflow-hidden rounded-xl border border-stone-200/60 bg-white p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-charcoal">
            Content Audit
          </h3>
          <button
            onClick={onRunAudit}
            disabled={auditing}
            className="flex items-center gap-2 rounded-xl bg-green-eco px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <svg
              className={`h-3.5 w-3.5 ${auditing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183"
              />
            </svg>
            {auditing ? "Koerer audit..." : "Koer audit nu"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-4 text-center">
            <p className={`font-mono text-2xl font-bold ${scoreColor(avgScore)}`}>
              {avgScore}
            </p>
            <p className="mt-1 text-xs text-stone-500">Gns. SEO-score</p>
          </div>
          <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-rose-600">
              {highIssues.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">Hoej prioritet</p>
          </div>
          <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-amber-600">
              {mediumIssues.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">Medium prioritet</p>
          </div>
          <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-blue-600">
              {lowIssues.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">Lav prioritet</p>
          </div>
        </div>
      </div>

      {/* Issues by severity */}
      {(
        [
          ["high", highIssues],
          ["medium", mediumIssues],
          ["low", lowIssues],
        ] as const
      ).map(([severity, issues]) => {
        if (issues.length === 0) return null;
        const config = SEVERITY_CONFIG[severity];

        return (
          <div
            key={severity}
            className="overflow-hidden rounded-xl border border-stone-200/60 bg-white"
          >
            <div className="border-b border-stone-200 px-5 py-3">
              <h4
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${config.color}`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${config.dotColor}`}
                />
                {config.label} prioritet ({issues.length})
              </h4>
            </div>
            <div className="divide-y divide-stone-100">
              {issues.map((issue, i) => (
                <div key={i} className={`px-5 py-3 ${config.bg}`}>
                  <p className="text-sm font-medium text-charcoal">
                    {issue.message}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-stone-500">
                    {issue.pagePath}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {allIssues.length === 0 && audits.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-stone-200/60 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-emerald-600">
            Alt ser godt ud!
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Ingen SEO-problemer fundet.
          </p>
        </div>
      )}
    </div>
  );
}
