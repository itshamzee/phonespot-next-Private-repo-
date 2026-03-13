"use client";

import { useState } from "react";

export default function B2BRegistrationPage() {
  const [form, setForm] = useState({
    companyName: "",
    cvrNummer: "",
    contactName: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/b2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message });
        setForm({ companyName: "", cvrNummer: "", contactName: "", email: "", phone: "" });
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch {
      setResult({ success: false, message: "Noget gik galt. Prov igen." });
    }
    setSubmitting(false);
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800">Erhvervskunde</h1>
        <p className="mt-2 text-stone-500">
          Registrer din virksomhed for at fa adgang til vores B2B-priser og vilkar.
        </p>
      </div>

      {result && (
        <div className={`mb-6 rounded-xl border p-4 ${
          result.success
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-stone-600">Firmanavn *</label>
          <input
            type="text"
            required
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600">CVR-nummer *</label>
          <input
            type="text"
            required
            pattern="\d{8}"
            maxLength={8}
            value={form.cvrNummer}
            onChange={(e) => update("cvrNummer", e.target.value)}
            placeholder="12345678"
            className="mt-1 w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600">Kontaktperson *</label>
          <input
            type="text"
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600">Telefon</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? "Sender..." : "Ansog om erhvervskonto"}
        </button>
        <p className="text-xs text-stone-400 text-center">
          Ansoegninger behandles inden for 1-2 hverdage.
          Alle priser er ekskl. moms for godkendte erhvervskunder.
        </p>
      </form>
    </div>
  );
}
