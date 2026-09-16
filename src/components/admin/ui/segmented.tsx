"use client";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Valg mellem få gensidigt udelukkende muligheder. Bruges hvor en dropdown
 * ville skjule valgene, fx produkttype eller "pr. model / universal".
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-cream p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={`rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light ${
              size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-3.5 py-1.5 text-[14px]"
            } ${active ? "bg-white text-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-gray hover:text-charcoal"}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
