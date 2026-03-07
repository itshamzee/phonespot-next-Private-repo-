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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Kunder
        </h2>
        <Link
          href="/admin/indlevering"
          className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          + Ny indlevering
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Soeg efter navn, email, telefon eller firma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      {loading ? (
        <p className="text-gray">Indlaeser kunder...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray">Ingen kunder fundet.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((customer) => (
            <Link
              key={customer.id}
              href={`/admin/kunder/${customer.id}`}
              className="block rounded-2xl border border-soft-grey bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-charcoal">{customer.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        customer.type === "erhverv"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {customer.type === "erhverv" ? "Erhverv" : "Privat"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray">
                    {customer.phone}
                    {customer.email && ` · ${customer.email}`}
                  </p>
                  {customer.type === "erhverv" && customer.company_name && (
                    <p className="mt-0.5 text-sm text-gray">
                      {customer.company_name}
                      {customer.cvr && ` (CVR: ${customer.cvr})`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
                    {customer.customer_devices.length}{" "}
                    {customer.customer_devices.length === 1 ? "enhed" : "enheder"}
                  </span>
                  <span className="text-xs text-gray">
                    Oprettet: {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
