"use client";

import { formatOere } from "@/lib/cart/utils";
import type { CartItem, CartDeviceItem } from "@/lib/cart/types";

export interface ShippingMethod {
  id: string;
  label: string;
  description: string;
  cost: number;
  disabled?: boolean;
  disabledReason?: string;
}

const STORE_LOCATIONS: { id: string; name: string; address: string }[] = [
  { id: "slagelse", name: "Slagelse", address: "VestsjællandsCentret 10, 4200 Slagelse" },
  { id: "vejle", name: "Vejle", address: "Vejle, Denmark" },
];

function getPickupMethods(items: CartItem[]): ShippingMethod[] {
  const deviceItems = items.filter((i): i is CartDeviceItem => i.type === "device");

  return STORE_LOCATIONS.map((store) => {
    // Check if ALL device items are available at this store
    const allDevicesAtStore =
      deviceItems.length === 0 ||
      deviceItems.every(
        (d) =>
          d.locationName?.toLowerCase() === store.name.toLowerCase(),
      );

    // For SKU items we always allow pickup (they can be picked from any store)
    // Only block if device items are not at this location
    const canPickup = allDevicesAtStore;

    return {
      id: `pickup_${store.id}`,
      label: `Hent i ${store.name} (gratis)`,
      description: canPickup
        ? `${store.address} — klar til afhentning`
        : `Ikke tilgængelig — varen er ikke på lager i ${store.name}`,
      cost: 0,
      disabled: !canPickup,
      disabledReason: canPickup
        ? undefined
        : `Varen er ikke på lager i ${store.name}`,
    };
  });
}

const DELIVERY_METHODS: ShippingMethod[] = [
  {
    id: "dao",
    label: "DAO Pakke",
    description: "Afhentning i nærmeste pakkeshop (2–4 hverdage)",
    cost: 4900,
  },
  {
    id: "postnord",
    label: "PostNord Levering",
    description: "Levering til døren (2–4 hverdage)",
    cost: 5900,
  },
];

interface ShippingSelectorProps {
  onSelect: (method: string, cost: number) => void;
  selected: string | null;
  items?: CartItem[];
}

export function ShippingSelector({ onSelect, selected, items = [] }: ShippingSelectorProps) {
  const pickupMethods = getPickupMethods(items);
  const allMethods = [...pickupMethods, ...DELIVERY_METHODS];

  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-charcoal">
        Leveringsmetode
      </legend>
      <div className="space-y-2">
        {allMethods.map((method) => {
          const isSelected = selected === method.id;
          const isDisabled = method.disabled === true;

          return (
            <label
              key={method.id}
              className={[
                "flex items-center gap-4 rounded-xl border p-4 transition-colors",
                isDisabled
                  ? "cursor-not-allowed border-stone-200 bg-stone-50 opacity-50"
                  : isSelected
                    ? "cursor-pointer border-green-eco bg-green-eco/5"
                    : "cursor-pointer border-sand bg-warm-white hover:border-charcoal/30",
              ].join(" ")}
            >
              <input
                type="radio"
                name="shipping"
                value={method.id}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => !isDisabled && onSelect(method.id, method.cost)}
                className="h-4 w-4 accent-green-eco disabled:accent-stone-300"
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <div>
                  <p className={[
                    "text-sm font-medium",
                    isDisabled ? "text-stone-400" : "text-charcoal",
                  ].join(" ")}>
                    {method.label}
                  </p>
                  <p className={[
                    "text-xs",
                    isDisabled ? "text-stone-400" : "text-gray-500",
                  ].join(" ")}>
                    {method.description}
                  </p>
                </div>
                <span className={[
                  "shrink-0 text-sm font-semibold",
                  isDisabled ? "text-stone-400" : "text-charcoal",
                ].join(" ")}>
                  {method.cost === 0 ? "Gratis" : formatOere(method.cost)}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
