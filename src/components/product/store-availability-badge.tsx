import Link from "next/link";
import type { StoreAvailability } from "@/lib/shopify/types";
import { STORE } from "@/lib/store-config";

type Props = {
  storeAvailability?: StoreAvailability[];
};

export function StoreAvailabilityBadge({ storeAvailability }: Props) {
  if (!storeAvailability || storeAvailability.length === 0) {
    return null;
  }

  // Find the Slagelse location
  const slagelse = storeAvailability.find(
    (sa) =>
      sa.location.name.toLowerCase().includes("slagelse") ||
      sa.location.name.toLowerCase().includes("vestsjælland") ||
      (STORE.shopifyLocationId && sa.location.id.includes(STORE.shopifyLocationId)),
  );

  if (!slagelse) return null;

  if (slagelse.available) {
    return (
      <Link
        href="/butik"
        className="flex items-center gap-2 rounded-xl bg-green-eco/5 px-4 py-2.5 transition-colors hover:bg-green-eco/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-4 w-4 text-green-eco"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
          />
        </svg>
        <span className="text-xs font-medium text-green-eco">
          På lager i Slagelse
          {slagelse.pickUpTime ? ` — ${slagelse.pickUpTime}` : " — Klar til afhentning"}
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-sand/40 px-4 py-2.5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4 text-gray"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
        />
      </svg>
      <span className="text-xs font-medium text-gray">
        Ikke på lager i butikken — bestil online med levering
      </span>
    </div>
  );
}
