"use client";

import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface B2BCustomer {
  id: string;
  company_name: string;
  cvr_nummer: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  approved: boolean;
  rejected: boolean;
  rejected_reason: string | null;
  approved_at: string | null;
  created_at: string;
  notes: string | null;
  discount_percentage: number | null;
  price_group: string | null;
  payment_terms: string | null;
}

type FilterTab = "alle" | "afventer" | "godkendte" | "afviste";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatus(c: B2BCustomer): "afventer" | "godkendt" | "afvist" {
  if (c.rejected) return "afvist";
  if (c.approved) return "godkendt";
  return "afventer";
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                         */
/* ------------------------------------------------------------------ */

function StatusBadge({ customer }: { customer: B2BCustomer }) {
  const status = getStatus(customer);

  const styles = {
    afventer: "bg-amber-100 text-amber-800 border-amber-200",
    godkendt: "bg-green-100 text-green-800 border-green-200",
    afvist: "bg-red-100 text-red-800 border-red-200",
  } as const;

  const labels = {
    afventer: "Afventer",
    godkendt: "Godkendt",
    afvist: "Afvist",
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  EditPanel                                                           */
/* ------------------------------------------------------------------ */

interface EditPanelProps {
  customer: B2BCustomer;
  onSave: (id: string, updates: Partial<B2BCustomer>) => Promise<void>;
  onClose: () => void;
}

function EditPanel({ customer, onSave, onClose }: EditPanelProps) {
  const [discount, setDiscount] = useState(String(customer.discount_percentage ?? ""));
  const [priceGroup, setPriceGroup] = useState(customer.price_group ?? "");
  const [paymentTerms, setPaymentTerms] = useState(customer.payment_terms ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(customer.id, {
      discount_percentage: discount !== "" ? Number(discount) : null,
      price_group: priceGroup || null,
      payment_terms: paymentTerms || null,
      notes: notes || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <tr>
      <td colSpan={8} className="bg-soft-grey/50 px-6 py-5">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
              Rabat %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-charcoal placeholder:text-gray/40 focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
              Prisgruppe
            </label>
            <select
              value={priceGroup}
              onChange={(e) => setPriceGroup(e.target.value)}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-charcoal focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
            >
              <option value="">Ingen</option>
              <option value="A">Gruppe A</option>
              <option value="B">Gruppe B</option>
              <option value="C">Gruppe C</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
              Betalingsbetingelser
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="f.eks. Netto 30"
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-charcoal placeholder:text-gray/40 focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
              Noter
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interne noter..."
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-charcoal placeholder:text-gray/40 focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-green-eco px-5 py-2 text-xs font-bold tracking-wide text-white transition-all hover:bg-green-light disabled:opacity-50"
            >
              {saving ? "Gemmer..." : "Gem"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-sand px-5 py-2 text-xs font-semibold text-charcoal transition-colors hover:bg-sand"
            >
              Annuller
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  RejectModal                                                         */
/* ------------------------------------------------------------------ */

interface RejectModalProps {
  customer: B2BCustomer;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function RejectModal({ customer, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 font-display text-lg font-bold text-charcoal">Afvis ansogning</h3>
        <p className="mb-4 text-sm text-gray">
          Afvis <span className="font-semibold text-charcoal">{customer.company_name}</span>
        </p>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
          Arsag (valgfri)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Beskriv arsagen til afvisningen..."
          className="w-full rounded-xl border border-sand bg-cream px-3 py-2 text-sm text-charcoal placeholder:text-gray/40 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            Afvis konto
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-sand px-4 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-sand"
          >
            Annuller
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminB2BPage() {
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("alle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<B2BCustomer | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/b2b");
      const data = await res.json() as B2BCustomer[];
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function patchCustomer(id: string, updates: Record<string, unknown>) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/b2b/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json() as B2BCustomer;
        setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(customer: B2BCustomer) {
    await patchCustomer(customer.id, { approved: true });
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    await patchCustomer(rejectTarget.id, {
      rejected: true,
      rejected_reason: reason || null,
    });
    setRejectTarget(null);
  }

  async function handleEdit(id: string, updates: Partial<B2BCustomer>) {
    await patchCustomer(id, updates as Record<string, unknown>);
  }

  /* Stats */
  const afventerCount = customers.filter((c) => !c.approved && !c.rejected).length;
  const godkendtCount = customers.filter((c) => c.approved).length;
  const afvistCount = customers.filter((c) => c.rejected).length;

  /* Filtered list */
  const filtered = customers.filter((c) => {
    if (filter === "afventer") return !c.approved && !c.rejected;
    if (filter === "godkendte") return c.approved;
    if (filter === "afviste") return c.rejected;
    return true;
  });

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: "alle", label: "Alle", count: customers.length },
    { key: "afventer", label: "Afventer", count: afventerCount },
    { key: "godkendte", label: "Godkendte", count: godkendtCount },
    { key: "afviste", label: "Afviste", count: afvistCount },
  ];

  return (
    <>
      {rejectTarget && (
        <RejectModal
          customer={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
              B2B Forhandlere
            </h2>
            <p className="mt-1 text-sm text-gray">
              {customers.length} {customers.length === 1 ? "ansogning" : "ansogninger"} i alt
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
              Afventer godkendelse
            </p>
            <p className="mt-1 text-3xl font-bold text-amber-800">{afventerCount}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700">
              Godkendte
            </p>
            <p className="mt-1 text-3xl font-bold text-green-800">{godkendtCount}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
              Afviste
            </p>
            <p className="mt-1 text-3xl font-bold text-red-800">{afvistCount}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-soft-grey p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                filter === tab.key
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-gray hover:text-charcoal"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === tab.key
                    ? "bg-green-eco text-white"
                    : "bg-sand text-gray"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[#E5E5EA] bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-eco border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray">
              Ingen ansogninger fundet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5EA] bg-soft-grey/60">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Firmanavn
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      CVR
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Kontaktperson
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Rabat %
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Oprettet
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {filtered.map((customer) => {
                    const isEditing = editingId === customer.id;
                    const isLoading = actionLoading === customer.id;
                    const status = getStatus(customer);

                    return (
                      <>
                        <tr
                          key={customer.id}
                          className={`transition-colors ${isEditing ? "bg-soft-grey/30" : "hover:bg-soft-grey/20"}`}
                        >
                          {/* Firmanavn */}
                          <td className="px-4 py-3">
                            <span className="font-semibold text-charcoal">
                              {customer.company_name}
                            </span>
                          </td>

                          {/* CVR */}
                          <td className="px-4 py-3 text-gray">
                            {customer.cvr_nummer ?? "—"}
                          </td>

                          {/* Kontaktperson */}
                          <td className="px-4 py-3 text-charcoal">
                            {customer.contact_name}
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3">
                            <a
                              href={`mailto:${customer.contact_email}`}
                              className="text-green-eco hover:underline"
                            >
                              {customer.contact_email}
                            </a>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge customer={customer} />
                            {customer.rejected && customer.rejected_reason && (
                              <p className="mt-0.5 text-[11px] text-gray truncate max-w-[140px]" title={customer.rejected_reason}>
                                {customer.rejected_reason}
                              </p>
                            )}
                          </td>

                          {/* Rabat */}
                          <td className="px-4 py-3 text-charcoal">
                            {customer.discount_percentage != null
                              ? `${customer.discount_percentage}%`
                              : "—"}
                          </td>

                          {/* Oprettet */}
                          <td className="px-4 py-3 text-gray whitespace-nowrap">
                            {formatDate(customer.created_at)}
                          </td>

                          {/* Handlinger */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {/* Approve */}
                              {status !== "godkendt" && (
                                <button
                                  onClick={() => handleApprove(customer)}
                                  disabled={isLoading}
                                  className="rounded-full bg-green-eco px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-green-light disabled:opacity-50"
                                >
                                  {isLoading ? "..." : "Godkend"}
                                </button>
                              )}

                              {/* Reject */}
                              {status !== "afvist" && (
                                <button
                                  onClick={() => setRejectTarget(customer)}
                                  disabled={isLoading}
                                  className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                >
                                  Afvis
                                </button>
                              )}

                              {/* Edit toggle */}
                              <button
                                onClick={() => setEditingId(isEditing ? null : customer.id)}
                                className="rounded-full border border-sand px-2.5 py-1 text-[11px] font-semibold text-charcoal transition-colors hover:bg-sand"
                              >
                                {isEditing ? "Luk" : "Rediger"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline edit panel */}
                        {isEditing && (
                          <EditPanel
                            key={`edit-${customer.id}`}
                            customer={customer}
                            onSave={handleEdit}
                            onClose={() => setEditingId(null)}
                          />
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
