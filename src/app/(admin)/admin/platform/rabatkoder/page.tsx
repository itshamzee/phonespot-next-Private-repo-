"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  min_order_amount: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  percentage: "Procent",
  fixed: "Fast beløb",
  free_shipping: "Gratis fragt",
};

export default function RabatkoderPage() {
  const supabase = createBrowserClient();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed" | "free_shipping",
    value: "",
    minOrderAmount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
  });

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/discount-codes", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setCodes(data.codes ?? []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/discount-codes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        value: form.type === "free_shipping" ? 0 : Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) * 100 : 0, // kr → øre
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ code: "", type: "percentage", value: "", minOrderAmount: "", validFrom: "", validUntil: "", usageLimit: "" });
      await loadCodes();
    } else {
      const data = await res.json();
      alert(data.error || "Fejl ved oprettelse");
    }
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Direct DB update via supabase client
    await supabase
      .from("discount_codes")
      .update({ is_active: !currentlyActive })
      .eq("id", id);

    await loadCodes();
  }

  function formatValue(code: DiscountCode): string {
    if (code.type === "percentage") return `${code.value}%`;
    if (code.type === "fixed") return `${(code.value / 100).toFixed(0)} kr`;
    return "Gratis fragt";
  }

  function isExpired(code: DiscountCode): boolean {
    if (!code.valid_until) return false;
    return new Date(code.valid_until) < new Date();
  }

  function isUsedUp(code: DiscountCode): boolean {
    if (!code.usage_limit) return false;
    return code.times_used >= code.usage_limit;
  }

  const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-charcoal focus:outline-none";
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Rabatkoder</h1>
          <p className="text-sm text-gray-500">Opret og administrer rabatkoder til checkout</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal/90"
        >
          {showForm ? "Annuller" : "+ Opret rabatkode"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Kode *</label>
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SOMMER20"
                required
                minLength={3}
              />
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
              >
                <option value="percentage">Procent (%)</option>
                <option value="fixed">Fast beløb (kr)</option>
                <option value="free_shipping">Gratis fragt</option>
              </select>
            </div>
            {form.type !== "free_shipping" && (
              <div>
                <label className={labelClass}>
                  Værdi * {form.type === "percentage" ? "(%)" : "(kr)"}
                </label>
                <input
                  className={inputClass}
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percentage" ? "20" : "100"}
                  required
                  min={1}
                  max={form.type === "percentage" ? 100 : undefined}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Min. ordrebeløb (kr)</label>
              <input
                className={inputClass}
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Gyldig fra</label>
              <input
                className={inputClass}
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Gyldig til</label>
              <input
                className={inputClass}
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Maks. brug</label>
              <input
                className={inputClass}
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                placeholder="Ubegrænset"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-eco px-6 py-2 text-sm font-semibold text-white hover:bg-green-eco/90 disabled:opacity-50"
            >
              {saving ? "Opretter..." : "Opret rabatkode"}
            </button>
          </div>
        </form>
      )}

      {/* Codes table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Indlæser...</div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-400">
          Ingen rabatkoder endnu. Klik &quot;Opret rabatkode&quot; for at starte.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Værdi</th>
                <th className="px-4 py-3">Min. ordre</th>
                <th className="px-4 py-3">Brugt</th>
                <th className="px-4 py-3">Gyldighed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const expired = isExpired(code);
                const usedUp = isUsedUp(code);
                const statusColor = !code.is_active
                  ? "bg-gray-100 text-gray-500"
                  : expired || usedUp
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700";
                const statusLabel = !code.is_active
                  ? "Deaktiveret"
                  : expired
                    ? "Udløbet"
                    : usedUp
                      ? "Opbrugt"
                      : "Aktiv";

                return (
                  <tr key={code.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-charcoal">{code.code}</td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[code.type]}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal">{formatValue(code)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {code.min_order_amount > 0
                        ? `${(code.min_order_amount / 100).toFixed(0)} kr`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {code.times_used}
                      {code.usage_limit ? ` / ${code.usage_limit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {code.valid_from && (
                        <div>Fra: {new Date(code.valid_from).toLocaleDateString("da-DK")}</div>
                      )}
                      {code.valid_until && (
                        <div>Til: {new Date(code.valid_until).toLocaleDateString("da-DK")}</div>
                      )}
                      {!code.valid_from && !code.valid_until && "Altid"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(code.id, code.is_active)}
                        className="text-xs text-gray-400 hover:text-charcoal"
                      >
                        {code.is_active ? "Deaktiver" : "Aktiver"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
