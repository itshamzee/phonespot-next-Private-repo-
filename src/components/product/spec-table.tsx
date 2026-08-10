import type { DisplaySpec } from "@/lib/product/spec-display";

type SpecTableProps = {
  specs: DisplaySpec[];
};

/**
 * Above-the-fold spec card for the device PDP buy column. A green-tinted
 * card with a small line icon per row — two columns on wider screens,
 * one column on mobile.
 */
export function SpecTable({ specs }: SpecTableProps) {
  if (specs.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-x-8 rounded-2xl bg-[#EFF5F1] px-4 py-1.5 sm:grid-cols-2 sm:px-5">
      {specs.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-center gap-3 border-b border-[#1A3D2E]/[0.08] py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#1A3D2E] shadow-sm">
            <SpecIcon label={label} />
          </span>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#1A3D2E]/55">
              {label}
            </dt>
            <dd
              title={value}
              className="line-clamp-2 break-words text-sm font-bold leading-snug text-[#111111]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Line icon per canonical spec label — see lib/product/spec-display.ts. */
function SpecIcon({ label }: { label: string }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4",
    "aria-hidden": true,
  };

  switch (label) {
    case "Chip":
    case "Processor":
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
        </svg>
      );
    case "Grafik":
      return (
        <svg {...common}>
          <path d="M12 3 3 8l9 5 9-5-9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
      );
    case "Hukommelse":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="8" rx="1.5" />
          <path d="M7 16v3M12 16v3M17 16v3M7 8V5M12 8V5M17 8V5" />
        </svg>
      );
    case "Lager":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
          <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </svg>
      );
    case "Skærm":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case "Batteri":
      return (
        <svg {...common}>
          <rect x="2" y="8" width="17" height="8" rx="2" />
          <path d="M22 11v2" />
          <path d="M6 11v2M10 11v2M14 11v2" />
        </svg>
      );
    case "Farve":
      return (
        <svg {...common}>
          <path d="M12 3c-4.97 0-9 3.58-9 8 0 4.42 4.03 8 9 8 .83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-3.31-4.03-6-9-6z" />
          <circle cx="7.5" cy="11.5" r="0.5" />
          <circle cx="10.5" cy="7.5" r="0.5" />
          <circle cx="14.5" cy="7.5" r="0.5" />
        </svg>
      );
    case "Styresystem":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
        </svg>
      );
    case "Vægt":
      return (
        <svg {...common}>
          <path d="M6 8h12l2.5 12h-17L6 8z" />
          <circle cx="12" cy="5.5" r="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
