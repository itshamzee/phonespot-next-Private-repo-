"use client";

import { useState, useEffect } from "react";
import { formatDKK } from "@/lib/platform/format";

interface LocationValuation {
  location: {
    id: string;
    name: string;
  };
  deviceCount: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  potentialMargin: number;
  byGrade: {
    A?: number;
    B?: number;
    C?: number;
  };
}

interface ValuationTotals {
  deviceCount: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  potentialMargin: number;
}

interface ValuationData {
  locations: LocationValuation[];
  totals: ValuationTotals;
}

function ValuationCard({
  title,
  deviceCount,
  totalPurchaseValue,
  totalSellingValue,
  potentialMargin,
  isTotal,
}: {
  title: string;
  deviceCount: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  potentialMargin: number;
  isTotal?: boolean;
}) {
  const marginPercent =
    totalSellingValue > 0
      ? Math.round((potentialMargin / totalSellingValue) * 100)
      : 0;

  return (
    <div
      className={[
        "rounded-2xl border p-5",
        isTotal
          ? "border-green-eco/30 bg-green-eco/5"
          : "border-stone-200 bg-white",
      ].join(" ")}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            {isTotal ? "Samlet lager" : "Lokation"}
          </p>
          <p className={["mt-0.5 font-bold", isTotal ? "text-green-eco" : "text-stone-800"].join(" ")}>
            {title}
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
          {deviceCount} {deviceCount === 1 ? "enhed" : "enheder"}
        </span>
      </div>

      {/* Values */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-stone-400">Indkøbsværdi</p>
          <p className="mt-0.5 text-sm font-semibold text-stone-700">
            {formatDKK(totalPurchaseValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Salgsværdi</p>
          <p className="mt-0.5 text-sm font-semibold text-stone-700">
            {formatDKK(totalSellingValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Margin</p>
          <p
            className={[
              "mt-0.5 text-sm font-bold",
              potentialMargin > 0 ? "text-green-700" : "text-stone-400",
            ].join(" ")}
          >
            {formatDKK(potentialMargin)}
            {marginPercent > 0 && (
              <span className="ml-1 text-xs font-semibold text-green-600">
                {marginPercent}%
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 animate-pulse">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <div className="h-3 w-16 rounded bg-stone-200" />
          <div className="h-4 w-28 rounded bg-stone-200" />
        </div>
        <div className="h-6 w-16 rounded-lg bg-stone-200" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-20 rounded bg-stone-200" />
            <div className="h-4 w-24 rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ValuationSummary() {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchValuation() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/platform/valuation");
        if (!res.ok) throw new Error("Kunne ikke hente lagerværdi");
        const json: ValuationData = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukendt fejl");
      } finally {
        setLoading(false);
      }
    }
    fetchValuation();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/* Per-location cards */}
      {data.locations.map((loc) => (
        <ValuationCard
          key={loc.location.id}
          title={loc.location.name}
          deviceCount={loc.deviceCount}
          totalPurchaseValue={loc.totalPurchaseValue}
          totalSellingValue={loc.totalSellingValue}
          potentialMargin={loc.potentialMargin}
        />
      ))}

      {/* Total card */}
      <ValuationCard
        title="Alle lokationer"
        deviceCount={data.totals.deviceCount}
        totalPurchaseValue={data.totals.totalPurchaseValue}
        totalSellingValue={data.totals.totalSellingValue}
        potentialMargin={data.totals.potentialMargin}
        isTotal
      />
    </div>
  );
}
