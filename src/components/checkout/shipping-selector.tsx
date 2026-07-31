"use client";

import { useEffect, useState } from "react";
import { formatOere } from "@/lib/cart/utils";
import { getShippingOptions } from "@/lib/shipping";
import { STORES } from "@/lib/store-config";
import { PickupPointPicker, type PickupPoint } from "./pickup-point-picker";
import type { CartItem, CartDeviceItem, CartSkuItem } from "@/lib/cart/types";

export interface ShippingMethod {
  id: string;
  label: string;
  description: string;
  cost: number;
  disabled?: boolean;
  disabledReason?: string;
  requiresPickupPoint?: boolean;
}

const STORE_LOCATIONS = Object.values(STORES).map((store) => ({
  id: store.slug,
  name: store.city,
  address: `${store.street}, ${store.zip} ${store.city}`,
}));

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

/**
 * From lib/shipping — the same list the checkout session prices against. These
 * used to be typed out here as well, which is how DAO stayed on the page after
 * it was removed everywhere else: this component never read that file.
 */
const DELIVERY_METHODS: ShippingMethod[] = getShippingOptions()
  .filter((o) => !o.method.startsWith("click_collect_"))
  .map((o) => ({
    id: o.method,
    label: o.label,
    description: o.requires_pickup_point
      ? `Vælg en pakkeshop nær dig (${o.delivery_estimate})`
      : `Leveres til din adresse (${o.delivery_estimate})`,
    cost: o.price,
    requiresPickupPoint: o.requires_pickup_point,
  }));

interface ShippingSelectorProps {
  onSelect: (method: string, cost: number) => void;
  selected: string | null;
  items?: CartItem[];
  /** From the address form, so we can look up shops near the customer. */
  zipcode?: string;
  pickupPoint?: PickupPoint | null;
  onPickupPoint?: (point: PickupPoint) => void;
}

export function ShippingSelector({
  onSelect,
  selected,
  items = [],
  zipcode = "",
  pickupPoint = null,
  onPickupPoint,
}: ShippingSelectorProps) {
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
  const activeMethod = allMethods.find((m) => m.id === selected);

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

      {activeMethod?.requiresPickupPoint && (
        <div className="mt-3 rounded-xl border border-sand bg-warm-white p-4">
          <p className="mb-3 text-sm font-medium text-charcoal">Vælg pakkeshop</p>
          <PickupPointPicker
            zipcode={zipcode}
            selected={pickupPoint}
            onSelect={(point) => onPickupPoint?.(point)}
          />
        </div>
      )}
    </fieldset>
  );
}
