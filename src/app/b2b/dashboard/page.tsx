"use client";

import Link from "next/link";
import { useB2B } from "@/components/b2b/b2b-context";

// TODO: Replace with real API data when B2B orders endpoint is available
const MOCK_RECENT_ORDERS = [
  {
    id: "ord-001",
    orderNumber: "B2B-2024-0041",
    date: "2024-04-03",
    status: "delivered",
    itemCount: 12,
    total: 384000, // in oere
  },
  {
    id: "ord-002",
    orderNumber: "B2B-2024-0038",
    date: "2024-03-29",
    status: "shipped",
    itemCount: 5,
    total: 162500,
  },
  {
    id: "ord-003",
    orderNumber: "B2B-2024-0035",
    date: "2024-03-22",
    status: "confirmed",
    itemCount: 20,
    total: 596000,
  },
  {
    id: "ord-004",
    orderNumber: "B2B-2024-0031",
    date: "2024-03-15",
    status: "delivered",
    itemCount: 8,
    total: 248000,
  },
  {
    id: "ord-005",
    orderNumber: "B2B-2024-0028",
    date: "2024-03-08",
    status: "delivered",
    itemCount: 3,
    total: 89500,
  },
];

// TODO: Replace with real stats API
const MOCK_STATS = {
  totalOrders: 41,
  activeRma: 2,
  savedAddresses: 3,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  confirmed: "Bekraeftet",
  shipped: "Afsendt",
  delivered: "Leveret",
  cancelled: "Annulleret",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-[#F7F7F8] text-[#6E6E73]",
};

const PRICE_GROUP_LABELS: Record<string, string> = {
  A: "Gruppe A — Premium",
  B: "Gruppe B — Standard",
  C: "Gruppe C — Basis",
};

function formatOere(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const QUICK_ACTIONS = [
  {
    href: "/reservedele",
    label: "Bestil reservedele",
    desc: "Se engros-sortiment",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    href: "/b2b/dashboard/reklamation",
    label: "Opret RMA",
    desc: "Indmeld reklamation",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    href: "/b2b/dashboard/lcd-opkob",
    label: "LCD Opkob",
    desc: "Saelg defekte skaerme",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
      </svg>
    ),
  },
];

export default function B2BDashboardPage() {
  const { user } = useB2B();

  const priceGroupLabel =
    user?.priceGroup
      ? PRICE_GROUP_LABELS[user.priceGroup] ?? `Gruppe ${user.priceGroup}`
      : null;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111111]">Oversigt</h1>
        <p className="mt-0.5 text-sm text-[#86868B]">
          Velkommen til dit B2B dashboard
        </p>
      </div>

      {/* Welcome card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1A3D2E] px-6 py-6 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/60">Velkommen tilbage</p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              {user?.companyName ?? "Virksomhed"}
            </h2>
            {user?.contactName && (
              <p className="mt-0.5 text-sm text-white/60">{user.contactName}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {priceGroupLabel && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {priceGroupLabel}
              </span>
            )}
            {/* TODO: Pull discountPercentage from B2B user when API exposes it */}
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              Erhvervskunde
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Ordrer i alt",
            value: MOCK_STATS.totalOrders,
            href: "/b2b/dashboard/ordrer",
            icon: (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            ),
          },
          {
            label: "Aktive RMA",
            value: MOCK_STATS.activeRma,
            href: "/b2b/dashboard/reklamation",
            icon: (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            ),
          },
          {
            label: "Gemte adresser",
            value: MOCK_STATS.savedAddresses,
            href: "/b2b/dashboard/adresser",
            icon: (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            ),
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-[#E5E5EA] bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A3D2E]/8 text-[#1A3D2E] transition-colors group-hover:bg-[#1A3D2E] group-hover:text-white">
                {stat.icon}
              </div>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-[#E5E5EA] transition-colors group-hover:text-[#1A3D2E]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <p className="mt-4 font-display text-2xl font-bold text-[#111111]">
              {stat.value}
            </p>
            <p className="mt-0.5 text-sm text-[#86868B]">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Bottom grid: recent orders + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders — takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5EA] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
              <h2 className="font-display text-base font-bold text-[#111111]">
                Seneste ordrer
              </h2>
              <Link
                href="/b2b/dashboard/ordrer"
                className="text-xs font-semibold text-[#1A3D2E] hover:underline"
              >
                Se alle
              </Link>
            </div>

            {/* TODO: Replace MOCK_RECENT_ORDERS with real API call to /api/b2b/orders */}
            <div className="divide-y divide-[#E5E5EA]">
              {MOCK_RECENT_ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111111]">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-[#86868B]">
                      {formatDate(order.date)} &middot; {order.itemCount} varer
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[order.status] ?? "bg-[#F7F7F8] text-[#6E6E73]"
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-sm font-semibold text-[#111111]">
                      {formatOere(order.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="rounded-xl border border-[#E5E5EA] bg-white">
            <div className="border-b border-[#E5E5EA] px-5 py-4">
              <h2 className="font-display text-base font-bold text-[#111111]">
                Hurtige handlinger
              </h2>
            </div>
            <div className="divide-y divide-[#E5E5EA]">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#F7F7F8]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/8 text-[#1A3D2E] transition-colors group-hover:bg-[#1A3D2E] group-hover:text-white">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111111]">
                      {action.label}
                    </p>
                    <p className="text-xs text-[#86868B]">{action.desc}</p>
                  </div>
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="ml-auto h-4 w-4 shrink-0 text-[#E5E5EA] transition-colors group-hover:text-[#1A3D2E]"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Support card */}
          <div className="mt-4 rounded-xl border border-[#E5E5EA] bg-white p-5">
            <p className="text-sm font-semibold text-[#111111]">Brug for hjaelp?</p>
            <p className="mt-1 text-xs leading-relaxed text-[#86868B]">
              Kontakt vores B2B-team pa hverdage 09-17.
            </p>
            <a
              href="mailto:b2b@phonespot.dk"
              className="mt-3 block text-sm font-medium text-[#1A3D2E] hover:underline"
            >
              b2b@phonespot.dk
            </a>
            <a
              href="tel:+4576000000"
              className="mt-1 block text-sm font-medium text-[#1A3D2E] hover:underline"
            >
              +45 76 00 00 00
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
