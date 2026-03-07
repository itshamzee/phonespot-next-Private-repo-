"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  Customer,
  CustomerDevice,
  RepairTicket,
  RepairStatus,
} from "@/lib/supabase/types";

const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  diagnostik: "Diagnostik",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "Faerdig",
  afhentet: "Afhentet",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-800",
  diagnostik: "bg-indigo-100 text-indigo-800",
  tilbud_sendt: "bg-yellow-100 text-yellow-800",
  godkendt: "bg-green-100 text-green-800",
  i_gang: "bg-orange-100 text-orange-800",
  faerdig: "bg-emerald-100 text-emerald-800",
  afhentet: "bg-gray-100 text-gray-800",
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [devices, setDevices] = useState<CustomerDevice[]>([]);
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: customerData } = await supabase
        .from("customers")
        .select("*, customer_devices(*)")
        .eq("id", id)
        .single();

      if (customerData) {
        setCustomer(customerData as Customer);
        setDevices((customerData as { customer_devices: CustomerDevice[] }).customer_devices ?? []);
      }

      const { data: ticketData } = await supabase
        .from("repair_tickets")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      setTickets((ticketData as RepairTicket[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) return <p className="text-gray">Indlaeser kunde...</p>;
  if (!customer) return <p className="text-gray">Kunde ikke fundet.</p>;

  return (
    <div>
      <Link
        href="/admin/kunder"
        className="mb-6 inline-block text-sm font-medium text-green-eco hover:underline"
      >
        &larr; Tilbage til kunder
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-charcoal">
                    {customer.name}
                  </h2>
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
                <p className="mt-1 text-sm text-gray">{customer.phone}</p>
                {customer.email && <p className="text-sm text-gray">{customer.email}</p>}
                {customer.company_name && (
                  <p className="mt-1 text-sm text-gray">
                    {customer.company_name}
                    {customer.cvr && ` (CVR: ${customer.cvr})`}
                  </p>
                )}
              </div>
              <Link
                href="/admin/indlevering"
                className="rounded-full bg-green-eco px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                + Ny indlevering
              </Link>
            </div>
          </div>

          {/* Devices */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Enheder ({devices.length})
            </h3>
            {devices.length === 0 ? (
              <p className="text-sm text-gray">Ingen enheder registreret.</p>
            ) : (
              <div className="grid gap-3">
                {devices.map((d) => (
                  <div key={d.id} className="rounded-xl border border-soft-grey p-4">
                    <p className="font-semibold text-charcoal">
                      {d.brand} {d.model}
                    </p>
                    <p className="text-sm text-gray">
                      {d.color && `${d.color} · `}
                      {d.serial_number && `S/N: ${d.serial_number}`}
                    </p>
                    {d.condition_notes && (
                      <p className="mt-1 text-xs text-gray">{d.condition_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tickets */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              Sager ({tickets.length})
            </h3>
            {tickets.length === 0 ? (
              <p className="text-sm text-gray">Ingen sager endnu.</p>
            ) : (
              <div className="grid gap-2">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/reparationer/${t.id}`}
                    className="flex items-center justify-between rounded-lg bg-warm-white p-3 text-sm transition-colors hover:bg-sand"
                  >
                    <div>
                      <span className="font-medium text-charcoal">{t.device_model}</span>
                      <span className="ml-2 text-gray">{t.issue_description.slice(0, 50)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[t.status]}`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                      <span className="text-xs text-gray">{formatDate(t.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray">
              Oversigt
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-green-eco">{tickets.length}</p>
                <p className="text-sm text-gray">Sager i alt</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-eco">{devices.length}</p>
                <p className="text-sm text-gray">Enheder</p>
              </div>
              <div>
                <p className="text-sm text-gray">
                  Kunde siden: {formatDate(customer.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
