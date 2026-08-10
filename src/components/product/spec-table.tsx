import type { DisplaySpec } from "@/lib/product/spec-display";

type SpecTableProps = {
  specs: DisplaySpec[];
};

/**
 * Scannable, above-the-fold spec table for the device PDP buy column.
 * Hairline-ruled rows, no filled boxes — two columns on wider screens,
 * one column on mobile.
 */
export function SpecTable({ specs }: SpecTableProps) {
  if (specs.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {specs.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-3 border-b border-[#E5E5EA] py-2"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#86868B]">
            {label}
          </dt>
          <dd
            className="truncate text-right text-sm font-semibold text-[#111111]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
