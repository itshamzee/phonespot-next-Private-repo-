"use client";

interface SEOKPICardsProps {
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  avgCTR: number;
  loading: boolean;
}

const CARDS = [
  {
    key: "clicks",
    label: "Klik (periode)",
    color: "text-blue-400",
    borderColor: "from-blue-500",
  },
  {
    key: "impressions",
    label: "Visninger",
    color: "text-violet-400",
    borderColor: "from-violet-500",
  },
  {
    key: "position",
    label: "Gns. position",
    color: "text-amber-400",
    borderColor: "from-amber-500",
  },
  {
    key: "ctr",
    label: "Gns. CTR",
    color: "text-emerald-400",
    borderColor: "from-emerald-500",
  },
] as const;

export function SEOKPICards({
  totalClicks,
  totalImpressions,
  avgPosition,
  avgCTR,
  loading,
}: SEOKPICardsProps) {
  const values: Record<string, string> = {
    clicks: totalClicks.toLocaleString("da-DK"),
    impressions: totalImpressions.toLocaleString("da-DK"),
    position: avgPosition.toFixed(1),
    ctr: `${(avgCTR * 100).toFixed(1)}%`,
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card, i) => (
        <div
          key={card.key}
          className="group relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900 p-5 transition-colors hover:border-zinc-700/60"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div
            className={`absolute left-4 right-4 top-0 h-px bg-gradient-to-r ${card.borderColor} to-transparent opacity-40`}
          />
          <p
            className={`font-mono text-2xl font-bold tracking-tight ${card.color} lg:text-3xl`}
          >
            {loading ? "..." : values[card.key]}
          </p>
          <p className="mt-1.5 text-xs font-medium text-zinc-500">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
