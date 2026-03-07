"use client";

import { useState, useEffect, useRef } from "react";
import type { Customer, CustomerType } from "@/lib/supabase/types";
import type { IntakeFormData } from "../page";

interface Props {
  formData: IntakeFormData;
  updateFormData: (partial: Partial<IntakeFormData>) => void;
  onNext: () => void;
}

export function CustomerStep({ formData, updateFormData, onNext }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Customer & { customer_devices?: unknown[] })[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(formData.isNewCustomer);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New customer form state
  const [newType, setNewType] = useState<CustomerType>("privat");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newCvr, setNewCvr] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } catch {
        // ignore
      }
      setSearching(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function selectCustomer(customer: Customer) {
    updateFormData({ customer, isNewCustomer: false });
    setQuery("");
    setResults([]);
    setShowForm(false);
  }

  async function handleCreateCustomer() {
    if (!newName.trim() || !newPhone.trim()) {
      setError("Navn og telefon er paakraevet");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          name: newName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || null,
          company_name: newType === "erhverv" ? newCompany.trim() || null : null,
          cvr: newType === "erhverv" ? newCvr.trim() || null : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kunne ikke oprette kunde");
        setCreating(false);
        return;
      }

      const customer = await res.json();
      updateFormData({ customer, isNewCustomer: true });
      setShowForm(false);
    } catch {
      setError("Netvaerksfejl");
    }
    setCreating(false);
  }

  const canProceed = formData.customer !== null;

  return (
    <div className="max-w-2xl">
      {formData.customer ? (
        <div className="mb-6 rounded-2xl border border-green-eco/30 bg-green-eco/5 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-eco">
                Valgt kunde
              </p>
              <p className="mt-1 text-lg font-bold text-charcoal">
                {formData.customer.name}
              </p>
              <p className="text-sm text-gray">
                {formData.customer.phone}
                {formData.customer.email && ` · ${formData.customer.email}`}
              </p>
              {formData.customer.type === "erhverv" && formData.customer.company_name && (
                <p className="mt-1 text-sm text-gray">
                  {formData.customer.company_name}
                  {formData.customer.cvr && ` (CVR: ${formData.customer.cvr})`}
                </p>
              )}
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                formData.customer.type === "erhverv"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {formData.customer.type === "erhverv" ? "Erhverv" : "Privat"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateFormData({ customer: null, isNewCustomer: false })}
              className="text-sm text-gray hover:text-charcoal"
            >
              Skift
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-charcoal">
              Soeg eksisterende kunde
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Telefon, email eller navn..."
              className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
            {searching && <p className="mt-1 text-xs text-gray">Soeger...</p>}

            {results.length > 0 && (
              <div className="mt-2 rounded-xl border border-soft-grey bg-white shadow-lg">
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="flex w-full items-center justify-between border-b border-soft-grey px-4 py-3 text-left last:border-0 hover:bg-sand"
                  >
                    <div>
                      <p className="font-semibold text-charcoal">{c.name}</p>
                      <p className="text-sm text-gray">{c.phone}{c.email && ` · ${c.email}`}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.type === "erhverv" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {c.type === "erhverv" ? "Erhverv" : "Privat"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-soft-grey" />
            <span className="text-sm text-gray">eller</span>
            <div className="h-px flex-1 bg-soft-grey" />
          </div>

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-full border border-soft-grey bg-white px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-sand"
            >
              + Opret ny kunde
            </button>
          ) : (
            <div className="rounded-2xl border border-soft-grey bg-white p-5">
              <h3 className="mb-4 font-semibold text-charcoal">Ny kunde</h3>

              {/* Type toggle */}
              <div className="mb-4 flex gap-2">
                {(["privat", "erhverv"] as CustomerType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      newType === t
                        ? "bg-green-eco text-white"
                        : "border border-soft-grey bg-white text-charcoal hover:bg-sand"
                    }`}
                  >
                    {t === "privat" ? "Privat" : "Erhverv"}
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal">
                    Navn *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                </div>

                {newType === "erhverv" && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-charcoal">
                        Firmanavn
                      </label>
                      <input
                        type="text"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-charcoal">
                        CVR
                      </label>
                      <input
                        type="text"
                        value={newCvr}
                        onChange={(e) => setNewCvr(e.target.value)}
                        className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                      />
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  disabled={creating}
                  className="rounded-full bg-green-eco px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? "Opretter..." : "Opret kunde"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-soft-grey px-6 py-3 text-sm font-medium text-charcoal hover:bg-sand"
                >
                  Annuller
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Next button */}
      <div className="mt-8">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Naeste: Enhed
        </button>
      </div>
    </div>
  );
}
