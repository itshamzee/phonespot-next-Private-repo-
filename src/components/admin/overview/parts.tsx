import Link from "next/link";
import type { ReactNode } from "react";
import { PERIOD_LABELS, type PeriodKey } from "@/lib/admin/overview/period";

/**
 * Byggeklodser til Overblik, Alle butikker og Økonomi (server components).
 * Mål og farver følger docs/design/admin-2026-10/Main.dc.html.
 */

export const linkClass = "text-[#1A3D2E] underline underline-offset-2 hover:text-[#2D6B45]";

export function PageHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-[#15211B] sm:text-[32px]">{children}</h1>
      {aside}
    </div>
  );
}

/** Periodevælger som links, så valget bor i URL'en og siden forbliver en server component. */
export function PeriodToggle({ periods, current, basePath }: { periods: PeriodKey[]; current: PeriodKey; basePath: string }) {
  return (
    <div role="group" aria-label="Periode" className="flex gap-1 rounded-[10px] bg-[#E9ECE7] p-1">
      {periods.map((p) => {
        const active = p === current;
        return (
          <Link
            key={p}
            href={`${basePath}?periode=${p}`}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={`flex h-[34px] items-center rounded-lg px-3.5 text-[14px] ${
              active ? "bg-white font-semibold text-[#15211B]" : "text-[#3D4842] hover:text-[#15211B]"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  note,
  tone = "muted",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "muted" | "positive" | "warning";
}) {
  const noteColor = tone === "positive" ? "text-[#23703F]" : tone === "warning" ? "text-[#9A5B0A]" : "text-[#5E6A63]";
  return (
    <div className="rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
      <div className="text-[14px] text-[#5E6A63]">{label}</div>
      <div className="mt-1.5 text-[28px] font-bold tabular-nums leading-tight">{value}</div>
      {note ? <div className={`mt-1 text-[13px] ${noteColor}`}>{note}</div> : null}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">{children}</div>;
}

export function PanelGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">{children}</div>;
}

export function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[17px] font-bold">{title}</h2>
        {aside ? <div className="text-[14px]">{aside}</div> : null}
      </div>
      <div className="mt-3 flex flex-col">{children}</div>
    </section>
  );
}

export function Row({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-[#EEF0EC] py-2.5 text-[14px]">
      <span className="min-w-0">{children}</span>
      {aside ? <span className="shrink-0 text-right">{aside}</span> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 border-t border-[#EEF0EC] py-2.5 text-[14px] text-[#5E6A63]">{children}</p>;
}
