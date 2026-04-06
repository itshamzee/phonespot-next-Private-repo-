"use client";

import { useEffect, useState } from "react";
import { formatOere } from "@/lib/cart/utils";
import type { CartItem, CartDeviceItem, CartSkuItem } from "@/lib/cart/types";

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

function getPickupMethods(
  items: CartItem[],
  skuStockByLocation: Record<string, string[]>,
): ShippingMethod[] {
  const deviceItems = items.filter((i): i is CartDeviceItem => i.type === "device");
  const skuItems = items.filter((i): i is CartSkuItem => i.type === "sku_product");

  return STORE_LOCATIONS.map((store) => {
    // Check if ALL device items are available at this store
    const allDevicesAtStore =
      deviceItems.length === 0 ||
      deviceItems.every(
        (d) =>
          d.locationName?.toLowerCase() === store.name.toLowerCase(),
      );

    // Check if ALL SKU items are available at this store
    const storeProductIds = skuStockByLocation[store.name] ?? [];
    const allSkusAtStore =
      skuItems.length === 0 ||
      skuItems.every((s) => storeProductIds.includes(s.skuProductId));

    const canPickup = allDevicesAtStore && allSkusAtStore;

    return {
      id: `pickup_${store.id}`,
      label: `Hent i ${store.name} (gratis)`,
      description: canPickup
        ? `${store.address} — klar til afhentning`
        : `Ikke tilgængelig — ikke alle varer er på lager i ${store.name}`,
      cost: 0,
      disabled: !canPickup,
      disabledReason: canPickup
        ? undefined
        : `Ikke alle varer er på lager i ${store.name}`,
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
  const [skuStockByLocation, setSkuStockByLocation] = useState<Record<string, string[]>>({});

  // Fetch per-location stock for SKU items to validate pickup availability
  const skuItems = items.filter((i): i is CartSkuItem => i.type === "sku_product");
  const skuProductIds = skuItems.map((s) => s.skuProductId);

  useEffect(() => {
    if (skuProductIds.length === 0) {
      setSkuStockByLocation({});
      return;
    }
    fetch("/api/checkout/sku-stock-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: skuProductIds }),
    })
      .then((r) => r.json())
      .then((data) => setSkuStockByLocation(data.locations ?? {}))
      .catch(() => setSkuStockByLocation({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(skuProductIds)]);

  const pickupMethods = getPickupMethods(items, skuStockByLocation);
  const allMethods = [...pickupMethods, ...DELIVERY_METHODS];

  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold tracking-tight text-charcoal">
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
