"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MegaMenu, MenuPanel } from "@/lib/navigation/mega-menu";
import { TILBEHOER_CATEGORIES } from "@/lib/tilbehoer-config";
import { StorefrontIcon } from "@/components/ui/storefront-icon";

export const NAV_CATEGORIES = [
  { label: "iPhones", href: "/iphones" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Ure", href: "/smartwatches" },
  { label: "Tilbehør", href: "/tilbehoer" },
  { label: "Lagersalg", href: "/lagersalg" },
] as const;

/** Lagersalg skiller sig ud med en dæmpet rød, som "Sale" i en tøjbutik. */
export const SALE_TEXT = "!text-[#B42318]";

/** Tilbehør har ingen lagerafhængige modeller i menuen; kategorierne er faste. */
export const TILBEHOER_PANEL: MenuPanel = {
  groups: [
    {
      title: "Kategorier",
      links: TILBEHOER_CATEGORIES.filter((c) => c.slug !== "outlet").map((c) => ({ label: c.label, href: `/tilbehoer/${c.slug}` })),
    },
    {
      title: "Gode køb",
      links: [
        { label: "Lagersalg på covers", href: "/lagersalg", note: "Nye covers fra lageret i Vejle" },
      ],
    },
  ],
  featured: null,
  allHref: "/tilbehoer",
  allLabel: "Se alt tilbehør",
};

function panelFor(menu: MegaMenu | null, href: string): MenuPanel | null {
  if (href === "/tilbehoer") return TILBEHOER_PANEL;
  const panel = menu?.[href as keyof MegaMenu];
  return panel && panel.groups.some((g) => g.links.length) ? panel : null;
}

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr.`;

/**
 * Kategorilinjen med mega-menu på computer: hold musen over (eller tab ind på)
 * en kategori, og et panel med modeller på lager åbner under menuen. Linket
 * selv fører stadig til kategorisiden. Panelerne åbner kun med mus og bred skærm.
 */
export function MegaNav({ menu, panelClassName, campaign = false }: { menu: MegaMenu | null; panelClassName: string; campaign?: boolean }) {
  const pathname = usePathname();
  // Åbent panel hører til den side, det blev åbnet på; et sideskift lukker det.
  const [openState, setOpenState] = useState<{ path: string; href: string } | null>(null);
  const open = openState?.path === pathname ? openState.href : null;
  const setOpen = (next: string | null | ((o: string | null) => string | null)) =>
    setOpenState((prev) => {
      const current = prev?.path === pathname ? prev.href : null;
      const value = typeof next === "function" ? next(current) : next;
      return value ? { path: pathname, href: value } : null;
    });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHover = useRef(false);
  // Fokus, der sendes tilbage til linket efter Escape, må ikke åbne panelet igen.
  const skipFocusOpen = useRef(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (min-width: 1024px)");
    canHover.current = mq.matches;
    const onChange = () => {
      canHover.current = mq.matches;
      if (!mq.matches) setOpenState(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const trigger = document.querySelector<HTMLElement>(`[data-mega-trigger="${open}"]`);
      setOpenState(null);
      skipFocusOpen.current = true;
      trigger?.focus();
      skipFocusOpen.current = false;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function schedule(next: string | null, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  }

  return (
    <>
      {NAV_CATEGORIES.map((item) => {
        const panel = panelFor(menu, item.href);
        const isOpen = open === item.href && panel != null;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const sale = item.href === "/lagersalg";
        return (
          <div
            key={item.href}
            className="flex self-stretch"
            onMouseEnter={() => canHover.current && schedule(panel ? item.href : null, open ? 0 : 120)}
            onMouseLeave={() => canHover.current && schedule(null, 160)}
            onFocus={() => canHover.current && panel && !skipFocusOpen.current && setOpen(item.href)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen((o) => (o === item.href ? null : o));
            }}
          >
            <Link
              href={item.href}
              data-mega-trigger={item.href}
              aria-expanded={panel ? isOpen : undefined}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center ${sale ? SALE_TEXT : ""} ${
                isOpen || active ? "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-current" : ""
              }`}
            >
              {item.label}
            </Link>
            {isOpen && panel && (
              <div className={panelClassName}>
                <PanelBody panel={panel} onNavigate={() => setOpen(null)} />
              </div>
            )}
          </div>
        );
      })}
      {campaign && (
        <div className="flex self-stretch">
          <Link
            href="/black-november"
            aria-current={pathname === "/black-november" ? "page" : undefined}
            className={"relative my-auto flex items-center " + SALE_TEXT}
          >
            Black November
          </Link>
        </div>
      )}
    </>
  );
}

function PanelBody({ panel, onNavigate }: { panel: MenuPanel; onNavigate: () => void }) {
  const groups = panel.groups.filter((g) => g.links.length);
  // Samme farver og former som kategorisidernes hero: grøn tekst, salviefarvet flade, 5px knapper.
  return (
    <div className="mx-auto flex max-w-[1392px] gap-10 px-9 pb-8 pt-7">
      <div className="flex flex-1 flex-col">
        <div className="grid gap-x-10 gap-y-6" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 4)}, minmax(0, 1fr))` }}>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-2 border-b border-[#d7dfcf] pb-2 text-[12px] font-semibold text-[#355542]">{g.title}</p>
              <ul className="flex flex-col">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={onNavigate}
                      className={`group/link flex min-h-9 items-baseline justify-between gap-3 py-1 text-[14px] font-medium hover:!no-underline ${
                        l.href === "/lagersalg" ? SALE_TEXT : "text-[#202421]"
                      }`}
                    >
                      <span className="group-hover/link:text-[#1a3d2e] group-hover/link:underline group-hover/link:underline-offset-4">
                        {l.label}
                        {l.note && <span className="block text-[12px] font-normal text-[#637066]">{l.note}</span>}
                      </span>
                      {l.fromKr != null && <span className="shrink-0 text-[12px] font-normal text-[#637066]">fra {kr(l.fromKr)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href={panel.allHref}
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center gap-6 rounded-[5px] bg-[#1a3d2e] px-[17px] py-3 text-[13px] font-semibold !text-white hover:bg-[#2a503b] hover:!no-underline"
          >
            {panel.allLabel}
            <StorefrontIcon kind="arrow" className="!h-[18px] !w-[18px]" />
          </Link>
        </div>
      </div>

      {panel.featured && (
        <Link
          href={panel.featured.href}
          onClick={onNavigate}
          className="group/feat flex w-[280px] shrink-0 flex-col rounded-[12px] bg-[#eaf0e3] p-6 text-[#1a3d2e] hover:!no-underline"
        >
          <span className="text-[12px] font-semibold text-[#355542]">Flest på lager lige nu</span>
          <span className="mt-3 flex aspect-[4/3] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={panel.featured.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain mix-blend-multiply" />
          </span>
          <span className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.03em] group-hover/feat:underline group-hover/feat:underline-offset-4">
            {panel.featured.label}
          </span>
          <span className="mt-1 text-[13px] text-[#4f5f56]">fra {kr(panel.featured.fromKr)}</span>
        </Link>
      )}
    </div>
  );
}
