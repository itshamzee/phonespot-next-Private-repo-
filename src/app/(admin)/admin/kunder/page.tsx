"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Customer, CustomerDevice } from "@/lib/supabase/types";

type CustomerWithDevices = Customer & { customer_devices: CustomerDevice[] };

export default function AdminKunderPage() {
  const [customers, setCustomers] = useState<CustomerWithDevices[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"alle" | "privat" | "erhverv">("alle");

  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      const { data } = await supabase
        .from("customers")
        .select("*, customer_devices(*)")
        .order("created_at", { ascending: false });
      setCustomers((data as CustomerWithDevices[]) ?? []);
      setLoading(false);
    }
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = customers.filter((c) => {
    if (typeFilter !== "alle" && c.type !== typeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      c.phone.includes(q) ||
      (c.company_name?.toLowerCase().includes(q) ?? false)
    );
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const privatCount = customers.filter((c) => c.type === "privat").length;
  const erhvervCount = customers.filter((c) => c.type === "erhverv").length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Kunder
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {customers.length} kunder totalt
          </p>
        </div>
        <Link
          href="/admin/indlevering"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ny indlevering
        </Link>
      </div>

      {/* Search + filter row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-4 w-4 text-charcoal/25" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="S\u00f8g efter navn, email, telefon eller firma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        <div className="flex gap-2">
          {([
            { key: "alle" as const, label: "Alle", count: customers.length },
            { key: "privat" as const, label: "Privat", count: privatCount },
            { key: "erhverv" as const, label: "Erhverv", count: erhvervCount },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                typeFilter === f.key
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                typeFilter === f.key ? "bg-white/20 text-white" : "bg-charcoal/[0.04] text-charcoal/30"
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser kunder...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen kunder fundet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
          <div className="divide-y divide-black/[0.03]">
            {filtered.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/kunder/${customer.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.015] sm:px-6"
              >
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  customer.type === "erhverv"
                    ? "bg-violet-500/10 text-violet-600"
                    : "bg-blue-500/10 text-blue-600"
                }`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-charcoal group-hover:text-emerald-700">
                      {customer.name}
                    </p>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      customer.type === "erhverv"
                        ? "bg-violet-500/10 text-violet-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}>
                      {customer.type === "erhverv" ? "Erhverv" : "Privat"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-charcoal/35">
                    {customer.phone}
                    {customer.email && ` \u00b7 ${customer.email}`}
                    {customer.type === "erhverv" && customer.company_name && ` \u00b7 ${customer.company_name}`}
                  </p>
                </div>

                {/* Right */}
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[10px] font-bold text-charcoal/35">
                    {customer.customer_devices.length}{" "}
                    {customer.customer_devices.length === 1 ? "enhed" : "enheder"}
                  </span>
                  <span className="hidden text-xs text-charcoal/20 sm:block">
                    {formatDate(customer.created_at)}
                  </span>
                  <svg className="h-4 w-4 text-charcoal/15" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
