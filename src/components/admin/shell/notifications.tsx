"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NavCounts } from "./sidebar";

/** Det der venter på personalet, som links. Tal kommer fra /api/admin/nav-counts (afgrænset til butikken). */
export function notificationItems(counts: NavCounts): { key: string; text: string; href: string }[] {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const items: { key: string; text: string; href: string }[] = [];
  if (counts.orders > 0) items.push({ key: "orders", text: `${plural(counts.orders, "ny webshop-ordre", "nye webshop-ordrer")}`, href: "/admin/platform/orders" });
  if (counts.newRepairs > 0) items.push({ key: "repairs", text: `${plural(counts.newRepairs, "ny sag", "nye sager")}`, href: "/admin/reparationer" });
  if (counts.inquiries > 0) items.push({ key: "inquiries", text: `${plural(counts.inquiries, "ny henvendelse", "nye henvendelser")}`, href: "/admin/henvendelser" });
  if (counts.buyback > 0) items.push({ key: "buyback", text: `${plural(counts.buyback, "nyt opkøb", "nye opkøb")}`, href: "/admin/opkoeb" });
  return items;
}

export function NotificationsButton({ counts }: { counts: NavCounts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = notificationItems(counts);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={items.length > 0 ? `Notifikationer, ${items.length} nye` : "Notifikationer"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#15211B] hover:bg-[#F5F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2E]/40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {items.length > 0 && <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#2F8F55] ring-2 ring-white" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-[60] w-64 rounded-xl border border-[#E2E5E0] bg-white p-1.5 text-[#15211B] shadow-lg">
          {items.length === 0 ? (
            <p className="px-2.5 py-2 text-[14px] text-[#5E6A63]">Intet nyt lige nu.</p>
          ) : (
            items.map((item) => (
              <Link key={item.key} role="menuitem" href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-2.5 py-2 text-[14px] hover:bg-[#F5F6F4]">
                {item.text}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
