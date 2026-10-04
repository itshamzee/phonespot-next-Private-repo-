"use client";

import Link from "next/link";
import { resolveActive, visibleNav, type CountKey, type NavArea } from "./nav";
import { useStoreScope } from "./store-scope-context";

export type NavCounts = Record<CountKey, number>;

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}

function Count({ value, muted = false }: { value: number; muted?: boolean }) {
  if (value <= 0) return null;
  return (
    <span
      className={`ml-auto min-w-5 rounded-[10px] px-2 text-center text-[12px] font-semibold leading-[20px] tabular-nums ${
        muted ? "bg-[#E9ECE7] text-[#3D4842]" : "bg-[#1A3D2E] text-white"
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

/**
 * Hovedmenuen (hvid, venstre). Samme punkter og rækkefølge som C1ST, i PhoneSpots
 * udtryk: DM Sans i sentence-case, aktivt punkt på lysegrøn flade.
 * På mobil er den en skuffe under topbjælken, som åbnes fra menuknappen.
 */
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
  const { isOwner } = useStoreScope();
  const nav = visibleNav(isOwner);
  const active = resolveActive(pathname, nav);
  const main = nav.filter((a) => !a.pinned);
  const pinned = nav.filter((a) => a.pinned);

  const renderArea = (area: NavArea, quiet = false) => {
    const isActive = active.area?.key === area.key;
    const expanded = isActive && (area.children?.length ?? 0) > 1;
    return (
      <li key={area.key}>
        <Link
          href={area.href}
          onClick={onNavigate}
          aria-current={isActive && !active.child ? "page" : undefined}
          className={`flex h-[42px] items-center gap-3 rounded-lg px-3 transition-colors ${
            quiet ? "text-[14px]" : "text-[15px]"
          } ${
            isActive
              ? "bg-[#E7EFE9] font-semibold text-[#1A3D2E]"
              : quiet
                ? "text-[#5E6A63] hover:bg-[#F5F6F4] hover:text-[#15211B]"
                : "text-[#15211B] hover:bg-[#F5F6F4]"
          }`}
        >
          <Icon paths={area.icon} />
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
                    className={`flex h-8 items-center rounded-lg pl-[42px] pr-3 text-[13px] transition-colors ${
                      current ? "font-semibold text-[#1A3D2E]" : "text-[#5E6A63] hover:text-[#15211B]"
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
      className={`fixed bottom-0 left-0 top-14 z-40 flex w-[232px] flex-col border-r border-[#E2E5E0] bg-white transition-transform duration-200 ease-out lg:static lg:shrink-0 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <nav aria-label="Hovedmenu" className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
        <ul className="flex flex-col gap-1">{main.map((a) => renderArea(a))}</ul>
      </nav>
      <div className="border-t border-[#E2E5E0] px-3 py-2">
        <ul className="flex flex-col gap-1">{pinned.map((a) => renderArea(a, true))}</ul>
      </div>
    </aside>
  );
}
