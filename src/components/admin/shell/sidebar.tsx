"use client";

import Link from "next/link";
import { NAV, resolveActive, type CountKey, type NavArea } from "./nav";

export type NavCounts = Record<CountKey, number>;

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden>
      {paths.map((d) => (
        <path key={d.slice(0, 24)} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

function Count({ value, muted = false }: { value: number; muted?: boolean }) {
  if (value <= 0) return null;
  return (
    <span
      className={`ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums ${
        muted ? "bg-sand text-charcoal" : "bg-charcoal text-white"
      }`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function areaCount(area: NavArea, counts: NavCounts): number {
  const own = area.countKey ? counts[area.countKey] : 0;
  return own + (area.children ?? []).reduce((n, c) => n + (c.countKey ? counts[c.countKey] : 0), 0);
}

export function Sidebar({
  pathname,
  counts,
  open,
  onNavigate,
}: {
  pathname: string;
  counts: NavCounts;
  open: boolean;
  onNavigate: () => void;
}) {
  const active = resolveActive(pathname);
  const main = NAV.filter((a) => !a.pinned);
  const pinned = NAV.filter((a) => a.pinned);

  const renderArea = (area: NavArea) => {
    const isActive = active.area?.key === area.key;
    const expanded = isActive && (area.children?.length ?? 0) > 1;
    return (
      <li key={area.key}>
        <Link
          href={area.href}
          onClick={onNavigate}
          aria-current={isActive && !active.child ? "page" : undefined}
          className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors ${
            isActive ? "bg-white font-semibold text-charcoal shadow-[0_0_0_1px_var(--color-sand)]" : "font-medium text-charcoal/75 hover:bg-white/70 hover:text-charcoal"
          }`}
        >
          <span className={isActive ? "text-green-eco" : "text-charcoal/45"}>
            <Icon paths={area.icon} />
          </span>
          {area.label}
          {!expanded && <Count value={areaCount(area, counts)} />}
        </Link>
        {expanded && (
          <ul className="mb-1 mt-0.5 flex flex-col">
            {area.children!.map((child) => {
              const current = active.child?.href === child.href;
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-8 items-center rounded-lg pl-[38px] pr-2.5 text-[13px] transition-colors ${
                      current ? "font-semibold text-charcoal" : "text-charcoal/65 hover:text-charcoal"
                    }`}
                  >
                    {child.label}
                    <Count value={child.countKey ? counts[child.countKey] : child.href === area.href && area.countKey ? counts[area.countKey] : 0} muted />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 top-14 z-40 flex w-[248px] flex-col border-r border-sand bg-[#EFEFF2] transition-transform duration-200 ease-out lg:static lg:shrink-0 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="px-3 pb-2 pt-3">
        <Link
          href="/admin/produkter/ny"
          onClick={onNavigate}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green-eco text-[13px] font-semibold text-white transition-colors hover:bg-green-light"
        >
          <span aria-hidden className="text-[16px] leading-none">+</span>
          Opret produkt
        </Link>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="flex flex-col gap-0.5">{main.map(renderArea)}</ul>
      </nav>
      <div className="border-t border-sand px-3 py-2">
        <ul className="flex flex-col gap-0.5">{pinned.map(renderArea)}</ul>
      </div>
    </aside>
  );
}
