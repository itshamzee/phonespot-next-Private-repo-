"use client";

export interface TrendDay {
  date: string;
  clicks: number;
  impressions: number;
}

interface KeywordTrendChartProps {
  data: TrendDay[];
  loading: boolean;
}

export function KeywordTrendChart({ data, loading }: KeywordTrendChartProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">
          Klik &amp; visninger over tid
        </h3>
        <div className="flex h-48 items-center justify-center text-sm text-zinc-600">
          Indlaeser...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">
          Klik &amp; visninger over tid
        </h3>
        <div className="flex h-48 items-center justify-center text-sm text-zinc-600">
          Ingen data endnu.
        </div>
      </div>
    );
  }

  const maxClicks = Math.max(...data.map((d) => d.clicks), 1);
  const maxImpressions = Math.max(...data.map((d) => d.impressions), 1);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">
          Klik &amp; visninger over tid
        </h3>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />
            Klik
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-400/50" />
            Visninger
          </span>
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-48">
        {data.map((day) => {
          const clickHeight = (day.clicks / maxClicks) * 100;
          const impressionHeight = (day.impressions / maxImpressions) * 100;
          const dateLabel = new Date(day.date).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "short",
          });
          return (
            <div
              key={day.date}
              className="group relative flex flex-1 flex-col items-center gap-0.5"
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 shadow-lg group-hover:block whitespace-nowrap z-10">
                <span className="font-medium">{dateLabel}</span>
                <br />
                <span className="text-blue-400">{day.clicks}</span> klik
                {" · "}
                <span className="text-violet-400">
                  {day.impressions.toLocaleString("da-DK")}
                </span>{" "}
                visninger
              </div>
              <div
                className="flex w-full items-end gap-px"
                style={{ height: "100%" }}
              >
                <div
                  className="flex-1 rounded-t-sm bg-blue-400 transition-all"
                  style={{ height: `${Math.max(clickHeight, 2)}%` }}
                />
                <div
                  className="flex-1 rounded-t-sm bg-violet-400/50 transition-all"
                  style={{ height: `${Math.max(impressionHeight, 2)}%` }}
                />
              </div>
              {data.length <= 14 && (
                <span className="mt-1 w-full truncate text-center text-[10px] text-zinc-600">
                  {new Date(day.date).getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
