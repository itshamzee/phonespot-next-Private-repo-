"use client";

import { ShippingOption, ShippingMethod } from "@/lib/shipmondo/types";
import { formatOere } from "@/lib/cart/utils";

interface ShippingMethodSelectorProps {
  options: ShippingOption[];
  selected: ShippingMethod | null;
  onSelect: (method: ShippingMethod) => void;
}

export function ShippingMethodSelector({
  options,
  selected,
  onSelect,
}: ShippingMethodSelectorProps) {
  const carrierOptions = options.filter(
    (o) => !o.method.startsWith("click_collect_")
  );
  const clickCollectOptions = options.filter((o) =>
    o.method.startsWith("click_collect_")
  );

  const renderOption = (option: ShippingOption) => {
    const isSelected = selected === option.method;
    return (
      <label
        key={option.method}
        className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
          isSelected
            ? "border-green-eco bg-green-eco/5"
            : "border-sand bg-warm-white hover:border-charcoal/30"
        }`}
      >
        <input
          type="radio"
          name="shipping-method"
          value={option.method}
          checked={isSelected}
          onChange={() => onSelect(option.method)}
          className="h-4 w-4 accent-green-eco"
        />
        <div className="flex flex-1 items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-charcoal">{option.label}</p>
            {option.delivery_estimate && (
              <p className="text-xs text-stone-500">{option.delivery_estimate}</p>
            )}
          </div>
          <span className="shrink-0 text-sm font-semibold text-charcoal">
            {option.price === 0 ? "Gratis" : formatOere(option.price)}
          </span>
        </div>
      </label>
    );
  };

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-charcoal">
        Leveringsmetode
      </legend>
      <div className="space-y-4">
        {carrierOptions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
              Levering
            </p>
            <div className="space-y-2">{carrierOptions.map(renderOption)}</div>
          </div>
        )}
        {clickCollectOptions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
              Afhentning i butik
            </p>
            <div className="space-y-2">
              {clickCollectOptions.map(renderOption)}
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}
