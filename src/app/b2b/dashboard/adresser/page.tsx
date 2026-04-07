"use client";

import { useState } from "react";

// TODO: Replace with real API to /api/b2b/addresses backed by customer.addresses JSONB column
interface Address {
  id: string;
  companyName: string;
  contactPerson: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  isDefault: boolean;
}

const INITIAL_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    companyName: "TechRepair ApS",
    contactPerson: "Mikkel Laursen",
    address: "Industrivej 14",
    postalCode: "7100",
    city: "Vejle",
    phone: "+45 76 12 34 56",
    isDefault: true,
  },
  {
    id: "addr-2",
    companyName: "TechRepair ApS — Afdeling Kolding",
    contactPerson: "Sara Hansen",
    address: "Seebladsgade 5",
    postalCode: "6000",
    city: "Kolding",
    phone: "+45 75 98 76 54",
    isDefault: false,
  },
  {
    id: "addr-3",
    companyName: "TechRepair ApS — Lager",
    contactPerson: "Mikkel Laursen",
    address: "Logistikvej 2, hal 3",
    postalCode: "7100",
    city: "Vejle",
    phone: "+45 76 12 34 56",
    isDefault: false,
  },
];

const EMPTY_FORM = {
  companyName: "",
  contactPerson: "",
  address: "",
  postalCode: "",
  city: "",
  phone: "",
};

const FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20";

export default function AdresserPage() {
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function handleField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openCreateForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(addr: Address) {
    setForm({
      companyName: addr.companyName,
      contactPerson: addr.contactPerson,
      address: addr.address,
      postalCode: addr.postalCode,
      city: addr.city,
      phone: addr.phone,
    });
    setEditingId(addr.id);
    setShowForm(true);
    setDeleteConfirmId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      // TODO: PATCH /api/b2b/addresses/{editingId}
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingId ? { ...a, ...form } : a
        )
      );
    } else {
      // TODO: POST /api/b2b/addresses
      const newAddr: Address = {
        id: `addr-${Date.now()}`,
        ...form,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, newAddr]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function setDefault(id: string) {
    // TODO: PATCH /api/b2b/addresses/{id} with { isDefault: true }
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  }

  function deleteAddress(id: string) {
    // TODO: DELETE /api/b2b/addresses/{id}
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
    if (editingId === id) {
      setShowForm(false);
      setEditingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111111]">
            Adresser
          </h1>
          <p className="mt-0.5 text-sm text-[#86868B]">
            Administrer dine leveringsadresser
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-full bg-[#1A3D2E] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Tilfoej adresse
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
          <h2 className="mb-5 font-display text-lg font-bold text-[#111111]">
            {editingId ? "Rediger adresse" : "Ny leveringsadresse"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="addr-company"
                  className="block text-sm font-medium text-[#111111]"
                >
                  Firmanavn
                </label>
                <input
                  id="addr-company"
                  name="companyName"
                  type="text"
                  required
                  value={form.companyName}
                  onChange={handleField}
                  placeholder="Virksomhed ApS"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="addr-contact"
                  className="block text-sm font-medium text-[#111111]"
                >
                  Kontaktperson
                </label>
                <input
                  id="addr-contact"
                  name="contactPerson"
                  type="text"
                  required
                  value={form.contactPerson}
                  onChange={handleField}
                  placeholder="Navn Efternavn"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="addr-street"
                className="block text-sm font-medium text-[#111111]"
              >
                Adresse
              </label>
              <input
                id="addr-street"
                name="address"
                type="text"
                required
                value={form.address}
                onChange={handleField}
                placeholder="Gadenavn 12, 2. th"
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="addr-zip"
                  className="block text-sm font-medium text-[#111111]"
                >
                  Postnr.
                </label>
                <input
                  id="addr-zip"
                  name="postalCode"
                  type="text"
                  required
                  pattern="\d{4}"
                  maxLength={4}
                  value={form.postalCode}
                  onChange={handleField}
                  placeholder="7100"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="addr-city"
                  className="block text-sm font-medium text-[#111111]"
                >
                  By
                </label>
                <input
                  id="addr-city"
                  name="city"
                  type="text"
                  required
                  value={form.city}
                  onChange={handleField}
                  placeholder="Vejle"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="addr-phone"
                className="block text-sm font-medium text-[#111111]"
              >
                Telefon
              </label>
              <input
                id="addr-phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleField}
                placeholder="+45 12 34 56 78"
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="rounded-full bg-[#1A3D2E] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                {editingId ? "Gem aendringer" : "Tilfoej adresse"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ ...EMPTY_FORM });
                }}
                className="text-sm text-[#86868B] hover:text-[#111111]"
              >
                Annuller
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address cards */}
      {addresses.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5EA] bg-white py-16 text-center">
          <p className="text-sm text-[#86868B]">Ingen adresser gemt endnu</p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 text-sm font-medium text-[#1A3D2E] hover:underline"
          >
            Tilfoej din foerste adresse
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`relative rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${
                addr.isDefault
                  ? "border-[#1A3D2E]/30 ring-1 ring-[#1A3D2E]/20"
                  : "border-[#E5E5EA]"
              }`}
            >
              {/* Default badge */}
              {addr.isDefault && (
                <span className="absolute right-4 top-4 rounded-full bg-[#1A3D2E]/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1A3D2E]">
                  Standard
                </span>
              )}

              {/* Address info */}
              <p className="pr-20 text-sm font-semibold text-[#111111]">
                {addr.companyName}
              </p>
              <p className="mt-0.5 text-sm text-[#86868B]">
                {addr.contactPerson}
              </p>
              <div className="mt-3 space-y-0.5 text-sm text-[#6E6E73]">
                <p>{addr.address}</p>
                <p>
                  {addr.postalCode} {addr.city}
                </p>
                <p>{addr.phone}</p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E5E5EA] pt-4">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(addr.id)}
                    className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition-colors hover:border-[#1A3D2E]/30 hover:text-[#1A3D2E]"
                  >
                    Saet som standard
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditForm(addr)}
                  className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition-colors hover:border-[#1A3D2E]/30 hover:text-[#111111]"
                >
                  Rediger
                </button>

                {deleteConfirmId === addr.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => deleteAddress(addr.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Bekraeft sletning
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-xs text-[#86868B] hover:text-[#111111]"
                    >
                      Annuller
                    </button>
                  </div>
                ) : (
                  !addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(addr.id)}
                      className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Slet
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
