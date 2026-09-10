import type { ReactNode } from "react";

const icons = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bag: <path d="M5 7h14l-1 14H6L5 7ZM9 7V5a3 3 0 0 1 6 0v2" />,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  person: <><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 5h4m-3 14h2" /></>,
  tablet: <><rect x="3" y="2" width="18" height="20" rx="2" /><path d="M11 19h2" /></>,
  laptop: <><rect x="4" y="3" width="16" height="13" rx="1" /><path d="M4 16 1 20h22l-3-4M9 20h6" /></>,
  watch: <><rect x="6" y="6" width="12" height="12" rx="4" /><path d="m8 6 1-4h6l1 4m-8 12 1 4h6l1-4m-4-9v3l2 1" /></>,
  repair: <path d="M14 4a6 6 0 0 0-7 8L2 17a3 3 0 0 0 5 5l5-5a6 6 0 0 0 8-7l-4 4-4-4 4-4Z" />,
  exchange: <path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4" />,
  cable: <path d="M7 2v4m4-4v4M5 6h8v4a4 4 0 0 1-8 0V6Zm4 8v3a4 4 0 0 0 8 0v-3m-2-4h4v4h-4z" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
} satisfies Record<string, ReactNode>;

export type StorefrontIconKind = keyof typeof icons;

export function StorefrontIcon({ kind, className }: { kind: StorefrontIconKind; className?: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{icons[kind]}</svg>;
}
