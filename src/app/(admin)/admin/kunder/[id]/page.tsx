"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
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
  faerdig: "Færdig",
  afhentet: "Afhentet",
  bero: "Bero",
  reklamation_modtaget: "Reklamation modtaget",
  reklamation_vurderet: "Reklamation vurderet",
  reklamation_loest: "Reklamation løst",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-800",
  diagnostik: "bg-indigo-100 text-indigo-800",
  tilbud_sendt: "bg-yellow-100 text-yellow-800",
  godkendt: "bg-green-100 text-green-800",
  i_gang: "bg-orange-100 text-orange-800",
  faerdig: "bg-emerald-100 text-emerald-800",
  afhentet: "bg-gray-100 text-gray-800",
  bero: "bg-rose-100 text-rose-800",
  reklamation_modtaget: "bg-red-100 text-red-800",
  reklamation_vurderet: "bg-purple-100 text-purple-800",
  reklamation_loest: "bg-teal-100 text-teal-800",
};

type Order = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  type: string;
  total: number;
  created_at: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [customerRes, ticketsRes, ordersRes] = await Promise.all([
        supabase
          .from("customers")
          .select("*, customer_devices(*)")
          .eq("id", id)
          .single(),
        supabase
          .from("repair_tickets")
          .select("*")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id, order_number, status, payment_status, type, total, created_at")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (customerRes.data) {
        setCustomer(customerRes.data as Customer);
        setDevices(
          (customerRes.data as { customer_devices: CustomerDevice[] }).customer_devices ?? [],
        );
      }
      setTickets((ticketsRes.data as RepairTicket[]) ?? []);
      setOrders((ordersRes.data as Order[]) ?? []);
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

  function formatDateLong(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
          <p className="text-sm text-charcoal/30">Indlæser kunde...</p>
        </div>
      </div>
    );
  }
  if (!customer) {
    return <p className="text-charcoal/40">Kunde ikke fundet.</p>;
  }

  // ---- Lifetime stats ---------------------------------------------------
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const lifetimeRevenue = paidOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const avgOrderValue = paidOrders.length > 0 ? Math.round(lifetimeRevenue / paidOrders.length) : 0;
  const lastOrderAt =
    orders.length > 0
      ? orders.map((o) => o.created_at).sort().reverse()[0]
      : null;
  const lastActivityAt =
    [
      ...orders.map((o) => o.created_at),
      ...tickets.map((t) => t.created_at),
    ]
      .sort()
      .reverse()[0] ?? customer.created_at;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/admin/kunder"
        className="mb-6 inline-block text-sm font-medium text-charcoal/40 transition hover:text-charcoal"
      >
        ← Tilbage til kunder
      </Link>

      {/* ── Header card ───────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal">
              {customer.name}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                customer.type === "erhverv"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {customer.type === "erhverv" ? "Erhverv" : "Privat"}
            </span>
          </div>
          <div className="mt-2 space-y-0.5 text-sm text-charcoal/55">
            <p>{customer.phone}</p>
            {customer.email && <p>{customer.email}</p>}
            {customer.company_name && (
              <p>
                {customer.company_name}
                {customer.cvr && ` · CVR: ${customer.cvr}`}
              </p>
            )}
            <p className="pt-1 text-xs text-charcoal/35">
              Kunde siden {formatDateLong(customer.created_at)}
            </p>
          </div>
        </div>

        {/* Quick action row */}
        <div className="flex flex-wrap gap-2">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-3.5 py-2 text-sm font-semibold text-charcoal/70 shadow-sm transition hover:bg-charcoal/[0.03]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M3 4a2 2 0 0 0-2 2v.6l9 5.142L19 6.6V6a2 2 0 0 0-2-2H3Z" />
                <path d="m19 8.84-7.94 4.535a2 2 0 0 1-1.98 0L1 8.84V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.84Z" />
              </svg>
              Send mail
            </a>
          )}
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-3.5 py-2 text-sm font-semibold text-charcoal/70 shadow-sm transition hover:bg-charcoal/[0.03]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z"
                clipRule="evenodd"
              />
            </svg>
            Ring op
          </a>
          <Link
            href="/admin/indlevering"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/15 transition hover:bg-emerald-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Ny indlevering
          </Link>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile
          label="Forbrug i alt"
          value={formatOere(lifetimeRevenue)}
          sub={`${paidOrders.length} ${paidOrders.length === 1 ? "betalt ordre" : "betalte ordrer"}`}
          accent="emerald"
        />
        <KpiTile
          label="Ordrer"
          value={String(orders.length)}
          sub={
            lastOrderAt
              ? `Senest ${formatDate(lastOrderAt)}`
              : "Ingen ordrer endnu"
          }
          accent="blue"
        />
        <KpiTile
          label="Gns. ordreværdi"
          value={paidOrders.length > 0 ? formatOere(avgOrderValue) : "—"}
          accent="violet"
        />
        <KpiTile
          label="Sager"
          value={String(tickets.length)}
          sub={`${devices.length} ${devices.length === 1 ? "enhed" : "enheder"} registreret`}
          accent="amber"
        />
      </div>

      <p className="mb-6 text-xs text-charcoal/35">
        Sidste aktivitet: {formatDate(lastActivityAt)}
      </p>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Orders + Tickets + Devices column ────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.04] px-6 py-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/50">
                Ordrer ({orders.length})
              </h3>
              {orders.length > 0 && (
                <span className="text-xs text-charcoal/35">
                  {formatOere(lifetimeRevenue)} omsat
                </span>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-charcoal/30">
                Ingen ordrer endnu.
              </div>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/platform/orders/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 transition hover:bg-charcoal/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">
                            #{o.order_number ?? o.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-charcoal/35">
                            {formatDate(o.created_at)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <OrderStatusBadge status={o.status} />
                          {o.payment_status && (
                            <PaymentBadge status={o.payment_status} />
                          )}
                          {o.type && o.type !== "online" && (
                            <span className="rounded-full bg-charcoal/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-charcoal/50">
                              {o.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-display text-base font-bold text-charcoal">
                        {formatOere(o.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tickets */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="border-b border-black/[0.04] px-6 py-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/50">
                Sager ({tickets.length})
              </h3>
            </div>
            {tickets.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-charcoal/30">
                Ingen sager endnu.
              </div>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/reparationer/${t.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-charcoal/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-charcoal">{t.device_model}</p>
                        <p className="truncate text-sm text-charcoal/45">
                          {t.issue_description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[t.status]}`}
                        >
                          {STATUS_LABELS[t.status]}
                        </span>
                        <span className="text-xs text-charcoal/35">
                          {formatDate(t.created_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Devices */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="border-b border-black/[0.04] px-6 py-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/50">
                Registrerede enheder ({devices.length})
              </h3>
            </div>
            {devices.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-charcoal/30">
                Ingen enheder registreret.
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-black/[0.04] bg-white p-4"
                  >
                    <p className="font-semibold text-charcoal">
                      {d.brand} {d.model}
                    </p>
                    <p className="text-sm text-charcoal/45">
                      {d.color && `${d.color}`}
                      {d.color && d.serial_number && " · "}
                      {d.serial_number && `S/N: ${d.serial_number}`}
                    </p>
                    {d.condition_notes && (
                      <p className="mt-1 text-xs text-charcoal/40">{d.condition_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar — quick stats + history summary ─────────────── */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-charcoal/50">
              Profil
            </h3>
            <dl className="space-y-3 text-sm">
              <Row label="Kundetype" value={customer.type === "erhverv" ? "Erhverv" : "Privat"} />
              <Row label="Telefon" value={customer.phone} />
              {customer.email && <Row label="Email" value={customer.email} />}
              {customer.company_name && (
                <Row label="Firma" value={customer.company_name} />
              )}
              {customer.cvr && <Row label="CVR" value={customer.cvr} />}
              <Row label="Oprettet" value={formatDate(customer.created_at)} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "emerald" | "blue" | "violet" | "amber";
}) {
  const accentMap = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/30">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-bold ${accentMap[accent]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-charcoal/40">{sub}</p>}
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Afventer", cls: "bg-amber-100 text-amber-800" },
    paid: { label: "Betalt", cls: "bg-green-100 text-green-800" },
    refunded: { label: "Refunderet", cls: "bg-red-100 text-red-700" },
    partially_refunded: { label: "Delvis ref.", cls: "bg-orange-100 text-orange-700" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-cream text-charcoal-light" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-charcoal/35">{label}</dt>
      <dd className="text-right text-charcoal/80">{value}</dd>
    </div>
  );
}
