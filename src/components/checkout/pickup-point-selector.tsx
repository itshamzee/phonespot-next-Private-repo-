"use client";

import { useEffect, useState } from "react";
import { SelectedPickupPoint } from "@/lib/shipmondo/types";

interface PickupPointRaw {
  id: string;
  company_name: string;
  address: string;
  zipcode: string;
  city: string;
  distance_in_meters?: number;
}

interface PickupPointSelectorProps {
  carrier: string;
  zipcode: string;
  onSelect: (point: SelectedPickupPoint) => void;
  selected: SelectedPickupPoint | null;
}

export function PickupPointSelector({
  carrier,
  zipcode,
  onSelect,
  selected,
}: PickupPointSelectorProps) {
  const [points, setPoints] = useState<PickupPointRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoints = async () => {
    if (!carrier || !zipcode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/shipping/pickup-points?carrier=${encodeURIComponent(carrier)}&zipcode=${encodeURIComponent(zipcode)}`
      );
      if (!res.ok) throw new Error("Kunne ikke hente pakkeshops");
      const data = await res.json();
      setPoints(data.points ?? []);
    } catch {
      setError("Der opstod en fejl. Prøv igen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier, zipcode]);

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(1) + " km";
  };

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-warm-white p-4">
      <p className="mb-3 text-sm font-semibold text-charcoal">Vælg pakkeshop</p>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-green-eco" />
        </div>
      )}

      {!loading && error && (
        <div className="py-4 text-center">
          <p className="mb-3 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchPoints}
            className="rounded-lg border border-stone-200 px-4 py-1.5 text-sm text-charcoal transition-colors hover:border-charcoal/40"
          >
            Prøv igen
          </button>
        </div>
      )}

      {!loading && !error && points.length === 0 && (
        <p className="py-4 text-center text-sm text-stone-500">
          Ingen pakkeshops fundet
        </p>
      )}

      {!loading && !error && points.length > 0 && (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {points.map((point) => {
            const isSelected = selected?.id === point.id;
            return (
              <li key={point.id}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      id: point.id,
                      name: point.company_name,
                      address: point.address,
                      zipcode: point.zipcode,
                      city: point.city,
                    })
                  }
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-green-eco bg-green-eco/5"
                      : "border-stone-200 hover:border-charcoal/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">
                        {point.company_name}
                      </p>
                      <p className="text-xs text-stone-500">{point.address}</p>
                      <p className="text-xs text-stone-500">
                        {point.zipcode} {point.city}
                      </p>
                    </div>
                    {point.distance_in_meters != null && (
                      <span className="shrink-0 text-xs text-stone-400">
                        {formatDistance(point.distance_in_meters)}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
