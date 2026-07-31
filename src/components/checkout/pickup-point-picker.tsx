"use client";

import { useEffect, useState } from "react";

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  zipcode: string;
  city: string;
  carrier_code: string;
  opening_hours?: string[];
}

const CARRIER_NAME: Record<string, string> = { pdk: "PostNord", gls: "GLS" };

/** "Monday: 10:00-18:00" from the API, in Danish and only for today. */
function todayHours(hours: string[] | undefined): string | null {
  if (!hours?.length) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[new Date().getDay()];
  const line = hours.find((h) => h.startsWith(today));
  if (!line) return null;
  const value = line.split(":").slice(1).join(":").trim();
  // Round-the-clock parcel boxes report 00:00 - 23:59.
  if (value.startsWith("00:00") && value.includes("23:59")) return "Åbent hele døgnet";
  return `I dag ${value}`;
}

interface Props {
  zipcode: string;
  selected: PickupPoint | null;
  onSelect: (point: PickupPoint) => void;
}

/**
 * The parcel shops actually near the customer, from Shipmondo.
 *
 * The checkout used to say "afhentning i nærmeste pakkeshop" and leave it at
 * that — no shop was ever chosen, so nobody knew where the parcel would land.
 * The customer picks a shop here and the carrier follows from it, rather than
 * asking them to pick a carrier they have no opinion about.
 */
export function PickupPointPicker({ zipcode, selected, onSelect }: Props) {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!/^\d{4}$/.test(zipcode)) return;

    let cancelled = false;

    // Deferred so nothing is set synchronously in the effect body.
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");

      fetch(`/api/shipping/pickup-points?zipcode=${zipcode}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.error) setError(data.error);
          else setPoints(data.points ?? []);
        })
        .catch(() => {
          if (!cancelled) setError("Kunne ikke hente pakkeshops. Prøv igen.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [zipcode]);

  if (!/^\d{4}$/.test(zipcode)) {
    return (
      <p className="rounded-xl bg-warm-white px-4 py-3 text-sm text-gray-500">
        Udfyld postnummeret ovenfor, så viser vi pakkeshops i nærheden.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="rounded-xl bg-warm-white px-4 py-3 text-sm text-gray-500">
        Henter pakkeshops nær {zipcode}...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    );
  }

  if (points.length === 0) {
    return (
      <p className="rounded-xl bg-warm-white px-4 py-3 text-sm text-gray-500">
        Vi fandt ingen pakkeshops ved {zipcode}. Vælg levering til døren i stedet.
      </p>
    );
  }

  const shown = showAll ? points : points.slice(0, 4);

  return (
    <div className="space-y-2">
      {shown.map((point) => {
        const isSelected = selected?.id === point.id;
        const hours = todayHours(point.opening_hours);
        return (
          <label
            key={`${point.carrier_code}-${point.id}`}
            className={[
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
              isSelected
                ? "border-green-eco bg-green-eco/5"
                : "border-sand bg-white hover:border-charcoal/30",
            ].join(" ")}
          >
            <input
              type="radio"
              name="pickup_point"
              checked={isSelected}
              onChange={() => onSelect(point)}
              className="mt-0.5 h-4 w-4 accent-green-eco"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-charcoal">{point.name}</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {point.address}, {point.zipcode} {point.city}
              </span>
              <span className="mt-0.5 block text-xs text-gray-400">
                {CARRIER_NAME[point.carrier_code] ?? point.carrier_code}
                {hours ? ` · ${hours}` : ""}
              </span>
            </span>
          </label>
        );
      })}

      {!showAll && points.length > shown.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm text-charcoal/50 underline hover:text-charcoal"
        >
          Vis {points.length - shown.length} flere pakkeshops
        </button>
      )}
    </div>
  );
}
