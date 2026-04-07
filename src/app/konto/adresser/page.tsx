"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type Address = {
  id: string;
  name: string;
  line1: string;
  postal_code: string;
  city: string;
  phone: string;
  is_default: boolean;
};

type AddressFormState = {
  name: string;
  line1: string;
  postal_code: string;
  city: string;
  phone: string;
  is_default: boolean;
};

const EMPTY_FORM: AddressFormState = {
  name: "",
  line1: "",
  postal_code: "",
  city: "",
  phone: "",
  is_default: false,
};

async function saveAddresses(token: string, addresses: Address[]): Promise<boolean> {
  const res = await fetch("/api/customer", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ addresses }),
  });
  return res.ok;
}

export default function AdresserPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Form state: null = hidden, object = editing (new or existing)
  const [form, setForm] = useState<AddressFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/customer", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.customer?.addresses ?? []);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, is_default: addresses.length === 0 });
    setSaveError("");
    setSaveSuccess("");
  }

  function startEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      name: addr.name,
      line1: addr.line1,
      postal_code: addr.postal_code,
      city: addr.city,
      phone: addr.phone,
      is_default: addr.is_default,
    });
    setSaveError("");
    setSaveSuccess("");
  }

  function cancelForm() {
    setForm(null);
    setEditingId(null);
    setSaveError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    let updated: Address[];

    if (editingId) {
      // Update existing
      updated = addresses.map((a) =>
        a.id === editingId ? { ...a, ...form } : a
      );
    } else {
      // Add new
      const newAddr: Address = {
        id: crypto.randomUUID(),
        ...form,
      };
      updated = [...addresses, newAddr];
    }

    // Enforce only one default
    if (form.is_default) {
      updated = updated.map((a) => ({
        ...a,
        is_default: editingId ? a.id === editingId : a.id === updated[updated.length - 1].id,
      }));
    }

    const ok = await saveAddresses(session.access_token, updated);
    setSaving(false);

    if (ok) {
      setAddresses(updated);
      setForm(null);
      setEditingId(null);
      setSaveSuccess(editingId ? "Adresse opdateret" : "Adresse tilfojet");
      setTimeout(() => setSaveSuccess(""), 3000);
    } else {
      setSaveError("Kunne ikke gemme. Prov igen.");
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const updated = addresses.filter((a) => a.id !== id);
    // If we deleted the default and there are remaining, make first one default
    const hadDefault = addresses.find((a) => a.id === id)?.is_default;
    if (hadDefault && updated.length > 0) {
      updated[0] = { ...updated[0], is_default: true };
    }

    const ok = await saveAddresses(session.access_token, updated);
    setSaving(false);
    setDeleteConfirm(null);

    if (ok) {
      setAddresses(updated);
      setSaveSuccess("Adresse slettet");
      setTimeout(() => setSaveSuccess(""), 3000);
    } else {
      setSaveError("Kunne ikke slette. Prov igen.");
    }
  }

  async function setDefault(id: string) {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const updated = addresses.map((a) => ({ ...a, is_default: a.id === id }));
    const ok = await saveAddresses(session.access_token, updated);
    setSaving(false);

    if (ok) {
      setAddresses(updated);
      setSaveSuccess("Standardadresse opdateret");
      setTimeout(() => setSaveSuccess(""), 3000);
    } else {
      setSaveError("Kunne ikke gemme. Prov igen.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#1A3D2E]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Adresser</h1>
          <p className="mt-1 text-sm text-[#6E6E73]">Administrer dine leveringsadresser</p>
        </div>
        {!form && (
          <button
            onClick={startAdd}
            className="rounded-lg bg-[#1A3D2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#143324]"
          >
            Tilfoej adresse
          </button>
        )}
      </div>

      {/* Feedback banners */}
      {saveSuccess && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-200">
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
          {saveError}
        </div>
      )}

      {/* Add / edit form */}
      {form && (
        <div className="rounded-xl border border-[#1A3D2E]/20 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[#111111]">
            {editingId ? "Rediger adresse" : "Ny adresse"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#111111]">Fuldt navn</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                  placeholder="Fornavn Efternavn"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#111111]">Adresselinje</label>
                <input
                  required
                  type="text"
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                  placeholder="Gadenavn 12, 3. tv"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111]">Postnummer</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                  placeholder="8000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111]">By</label>
                <input
                  required
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                  placeholder="Aarhus C"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#111111]">Telefonnummer</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                  placeholder="+45 12 34 56 78"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-[#E5E5EA] accent-[#1A3D2E]"
              />
              <span className="text-sm text-[#111111]">Saet som standard leveringsadresse</span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#1A3D2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143324] disabled:opacity-50"
              >
                {saving ? "Gemmer..." : editingId ? "Gem aendringer" : "Tilfoej adresse"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg border border-[#E5E5EA] px-5 py-2.5 text-sm font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC]"
              >
                Annuller
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address list */}
      {addresses.length === 0 && !form ? (
        <div className="rounded-xl border border-[#E5E5EA] bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F2EC]">
            <svg className="h-5 w-5 text-[#AEAEB2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#111111]">Ingen adresser endnu</p>
          <p className="mt-1 text-xs text-[#6E6E73]">Tilfoej en leveringsadresse for hurtigere checkout</p>
          <button
            onClick={startAdd}
            className="mt-4 rounded-lg bg-[#1A3D2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#143324]"
          >
            Tilfoej adresse
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-xl border bg-white p-5 transition ${
                addr.is_default ? "border-[#1A3D2E]/30 ring-1 ring-[#1A3D2E]/20" : "border-[#E5E5EA]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111111]">{addr.name}</p>
                    {addr.is_default && (
                      <span className="rounded-full bg-[#1A3D2E]/10 px-2 py-0.5 text-xs font-medium text-[#1A3D2E]">
                        Standard
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[#6E6E73]">{addr.line1}</p>
                  <p className="text-sm text-[#6E6E73]">
                    {addr.postal_code} {addr.city}
                  </p>
                  {addr.phone && (
                    <p className="mt-0.5 text-sm text-[#6E6E73]">{addr.phone}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => startEdit(addr)}
                  className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC] hover:text-[#111111]"
                >
                  Rediger
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    disabled={saving}
                    className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC] hover:text-[#111111] disabled:opacity-50"
                  >
                    Saet som standard
                  </button>
                )}
                {deleteConfirm === addr.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6E6E73]">Sikker?</span>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      disabled={saving}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Ja, slet
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC]"
                    >
                      Annuller
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(addr.id)}
                    className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50"
                  >
                    Slet
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
