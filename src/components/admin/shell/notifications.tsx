"use client";

import { useRef } from "react";
import Link from "next/link";
import type { NavCounts } from "./sidebar";
import { NavPendingSignal } from "./nav-pending";
import { menuItemClass, usePopoverMenu } from "./use-popover-menu";

/** Det der venter på personalet, som links. Tal kommer fra /api/admin/nav-counts (afgrænset til butikken). */
type NotificationItem = { key: string; text: string; href: string; count: number };

export function notificationItems(counts: NavCounts): NotificationItem[] {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const items: NotificationItem[] = [];
  if (counts.orders > 0) items.push({ key: "orders", text: `${plural(counts.orders, "ny webshop-ordre", "nye webshop-ordrer")}`, href: "/admin/platform/orders", count: counts.orders });
  if (counts.webBookings > 0)
    items.push({
      key: "webBookings",
      text: plural(counts.webBookings, "ny reparationsanmodning", "nye reparationsanmodninger"),
      href: "/admin/reparationer?fane=web",
      count: counts.webBookings,
    });
  // Sager oprettet ved disken står også som "modtaget", men de er allerede i hus og er ikke nye for nogen.
  if (counts.inquiries > 0) items.push({ key: "inquiries", text: `${plural(counts.inquiries, "ny henvendelse", "nye henvendelser")}`, href: "/admin/henvendelser", count: counts.inquiries });
  if (counts.buyback > 0) items.push({ key: "buyback", text: `${plural(counts.buyback, "nyt opkøb", "nye opkøb")}`, href: "/admin/opkoeb", count: counts.buyback });
  return items;
}

export function NotificationsButton({ counts }: { counts: NavCounts }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menu = usePopoverMenu({ wrapRef, triggerRef, panelRef });
  const items = notificationItems(counts);
  const total = items.reduce((n, i) => n + i.count, 0);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={menu.open}
        aria-controls={menu.panelId}
        onClick={menu.toggle}
        aria-haspopup="menu"
        aria-label={total > 0 ? `Notifikationer, ${total} nye` : "Notifikationer"}
        className="m-press m-tap relative flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[#15211B] hover:bg-[#F5F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2E]/40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {total > 0 && (
          <span aria-hidden className="min-w-5 rounded-[10px] bg-[#1A3D2E] px-1.5 text-center text-[12px] font-semibold leading-[20px] text-white tabular-nums">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {/* Altid monteret (.m-pop), så panelet kan tone ind og ud. */}
      <div
        ref={panelRef}
        id={menu.panelId}
        tabIndex={-1}
        data-open={menu.open}
        aria-hidden={menu.open ? undefined : true}
        role="menu"
        aria-label="Notifikationer"
        className="m-pop absolute right-0 top-11 z-[60] w-64 rounded-xl border border-[#E2E5E0] bg-white p-1.5 text-[#15211B] outline-none"
      >
        {items.length === 0 ? (
          <p className="px-2.5 py-2 text-[14px] text-[#5E6A63]">Intet nyt lige nu.</p>
        ) : (
          items.map((item) => (
            <Link key={item.key} role="menuitem" href={item.href} onClick={menu.closeAndReturn} className={menuItemClass}>
              {item.text}
              <NavPendingSignal />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
