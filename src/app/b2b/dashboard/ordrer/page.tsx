"use client";

import { useState } from "react";

// TODO: Replace with real API call to /api/b2b/orders when endpoint is implemented
const MOCK_ORDERS = [
  {
    id: "ord-001",
    orderNumber: "B2B-2024-0041",
    date: "2024-04-03",
    status: "delivered",
    itemCount: 12,
    total: 384000,
    items: [
      { name: "iPhone 15 Pro skaerm — Premium OLED", qty: 5, unitPrice: 42000 },
      { name: "iPhone 14 batteri — OEM", qty: 7, unitPrice: 18000 },
    ],
  },
  {
    id: "ord-002",
    orderNumber: "B2B-2024-0038",
    date: "2024-03-29",
    status: "shipped",
    itemCount: 5,
    total: 162500,
    items: [
      { name: "Samsung S23 skaerm — In-Cell", qty: 3, unitPrice: 32500 },
      { name: "iPhone 13 bagcover — sort", qty: 2, unitPrice: 15000 },
    ],
  },
  {
    id: "ord-003",
    orderNumber: "B2B-2024-0035",
    date: "2024-03-22",
    status: "confirmed",
    itemCount: 20,
    total: 596000,
    items: [
      { name: "iPhone 15 skaerm — Service Pack", qty: 10, unitPrice: 45000 },
      { name: "iPhone 14 Pro skaerm — Premium Soft OLED", qty: 5, unitPrice: 38000 },
      { name: "USB-C opladningsstik — iPhone 15 serie", qty: 5, unitPrice: 8200 },
    ],
  },
  {
    id: "ord-004",
    orderNumber: "B2B-2024-0031",
    date: "2024-03-15",
    status: "delivered",
    itemCount: 8,
    total: 248000,
    items: [
      { name: "iPhone 12 batteri — OEM", qty: 8, unitPrice: 16000 },
    ],
  },
  {
    id: "ord-005",
    orderNumber: "B2B-2024-0028",
    date: "2024-03-08",
    status: "delivered",
    itemCount: 3,
    total: 89500,
    items: [
      { name: "iPhone 11 skaerm — Hard OLED", qty: 3, unitPrice: 29833 },
    ],
  },
  {
    id: "ord-006",
    orderNumber: "B2B-2024-0021",
    date: "2024-02-28",
    status: "cancelled",
    itemCount: 4,
    total: 112000,
    items: [
      { name: "Samsung S22 skaerm — AMOLED", qty: 4, unitPrice: 28000 },
    ],
  },
  {
    id: "ord-007",
    orderNumber: "B2B-2024-0018",
    date: "2024-02-19",
    status: "delivered",
    itemCount: 15,
    total: 427500,
    items: [
      { name: "iPhone 13 Pro skaerm — Premium OLED", qty: 8, unitPrice: 36500 },
      { name: "iPhone 13 batteri", qty: 7, unitPrice: 16500 },
    ],
  },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  confirmed: "Bekraeftet",
  shipped: "Afsendt",
  delivered: "Leveret",
  cancelled: "Annulleret",
  refunded: "Refunderet",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-[#F7F7F8] text-[#6E6E73]",
  refunded: "bg-red-100 text-red-700",
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
    month: "long",
    year: "numeric",
  });
}

const ALL_STATUSES = ["alle", "pending", "confirmed", "shipped", "delivered", "cancelled"];

export default function B2BOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = MOCK_ORDERS.filter((o) => {
    const matchSearch = search.trim() === "" ||
      o.orderNumber.toLowerCase().includes(search.trim().toLowerCase());
    const matchStatus = statusFilter === "alle" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111111]">Ordrer</h1>
        <p className="mt-0.5 text-sm text-[#86868B]">
          Din komplette ordrehistorik
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Soeg ordrenummer..."
            className="w-full rounded-xl border border-[#E5E5EA] bg-white py-2.5 pl-9 pr-4 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "border-[#1A3D2E] bg-[#1A3D2E] text-white"
                  : "border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#1A3D2E]/30 hover:text-[#111111]"
              }`}
            >
              {s === "alle" ? "Alle" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5EA] bg-white py-16 text-center">
          <p className="text-sm text-[#86868B]">Ingen ordrer matcher din soegning</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="rounded-xl border border-[#E5E5EA] bg-white overflow-hidden">
                {/* Order row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(order.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-[#F7F7F8]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#111111]">{order.orderNumber}</p>
                    <p className="text-xs text-[#86868B]">
                      {formatDate(order.date)} &middot; {order.itemCount}{" "}
                      {order.itemCount === 1 ? "vare" : "varer"}
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
                    <span className="text-sm font-bold text-[#111111]">
                      {formatOere(order.total)}
                    </span>
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className={`h-4 w-4 text-[#86868B] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-[#E5E5EA] bg-[#F7F7F8] px-5 py-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#86868B]">
                      Ordrelinjer
                    </p>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 border border-[#E5E5EA]"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-[#111111]">{item.name}</p>
                            <p className="text-xs text-[#86868B]">
                              {item.qty} stk &times; {formatOere(item.unitPrice)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-[#111111]">
                            {formatOere(item.qty * item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end border-t border-[#E5E5EA] pt-3">
                      <span className="text-sm font-bold text-[#111111]">
                        Total: {formatOere(order.total)}
                      </span>
                    </div>

                    {/* TODO: Add "Download faktura" and "Kontakt om denne ordre" when APIs are ready */}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implement PDF invoice download via /api/b2b/orders/{id}/invoice
                          alert("Fakturadownload kommer snart");
                        }}
                        className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-medium text-[#6E6E73] hover:border-[#1A3D2E]/30 hover:text-[#111111]"
                      >
                        Download faktura
                      </button>
                      {["pending", "confirmed"].includes(order.status) && (
                        <a
                          href="mailto:b2b@phonespot.dk"
                          className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-medium text-[#6E6E73] hover:border-[#1A3D2E]/30 hover:text-[#111111]"
                        >
                          Kontakt om ordre
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-[#86868B]">
        Viser {filtered.length} af {MOCK_ORDERS.length} ordrer
      </p>
    </div>
  );
}
