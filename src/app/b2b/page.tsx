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
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
          B2B
        </p>
        <h1 className="text-3xl font-bold text-[#111111]">Erhvervskunde</h1>
        <p className="mt-2 text-[#86868B]">
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

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#E5E5EA] bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-[#111111]">Firmanavn *</label>
          <input
            type="text"
            required
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#111111]">CVR-nummer *</label>
          <input
            type="text"
            required
            pattern="\d{8}"
            maxLength={8}
            value={form.cvrNummer}
            onChange={(e) => update("cvrNummer", e.target.value)}
            placeholder="12345678"
            className="mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#111111]">Kontaktperson *</label>
          <input
            type="text"
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#111111]">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#111111]">Telefon</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#1A3D2E] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Sender..." : "Ansog om erhvervskonto"}
        </button>
        <p className="text-xs text-[#86868B] text-center">
          Ansøgninger behandles inden for 1-2 hverdage.
          Alle priser er ekskl. moms for godkendte erhvervskunder.
        </p>
      </form>
    </div>
  );
}
