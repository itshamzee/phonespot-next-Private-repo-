"use client";

import { formatOere } from "@/lib/cart/utils";

export interface ShippingMethod {
  id: string;
  label: string;
  description: string;
  cost: number;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
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
  {
    id: "free",
    label: "Afhentning i butik",
    description: "VestsjællandsCentret 10, 4200 Slagelse — gratis",
    cost: 0,
  },
];

interface ShippingSelectorProps {
  onSelect: (method: string, cost: number) => void;
  selected: string | null;
}

export function ShippingSelector({ onSelect, selected }: ShippingSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-charcoal">Leveringsmetode</legend>
      <div className="space-y-2">
        {SHIPPING_METHODS.map((method) => {
          const isSelected = selected === method.id;
          return (
            <label
              key={method.id}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-green-eco bg-green-eco/5"
                  : "border-sand bg-warm-white hover:border-charcoal/30"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                value={method.id}
                checked={isSelected}
                onChange={() => onSelect(method.id, method.cost)}
                className="h-4 w-4 accent-green-eco"
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-charcoal">{method.label}</p>
                  <p className="text-xs text-gray-500">{method.description}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-charcoal">
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
