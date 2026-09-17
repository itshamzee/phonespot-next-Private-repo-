"use client";

import { useId } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light focus-visible:ring-offset-2 ${
          checked ? "bg-green-eco" : "bg-sand"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="flex flex-col">
        <span className="text-[14px] font-medium text-charcoal">{label}</span>
        {description && <span className="text-[13px] text-gray">{description}</span>}
      </span>
    </label>
  );
}
