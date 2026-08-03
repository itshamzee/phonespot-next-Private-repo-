"use client";

import { useState } from "react";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { parsePostalCity } from "@/lib/buyback/seller-address";

interface Props {
  offerId: string;
  sellerName: string;
  sellerAddress: string;
  /** As stored: "4200 Slagelse", or whatever the customer actually typed. */
  sellerPostalCity: string;
  onSaved: () => void;
}

/**
 * The address the parcel is collected from, editable.
 *
 * The acceptance form used to accept anything, so offers exist with "213123"
 * or a bare "4000" where a postcode should be. Those cannot be booked, and
 * until now the only way to fix one was to edit the database.
 */
export default function SellerAddressEditor({
  offerId,
  sellerName,
  sellerAddress,
  sellerPostalCity,
  onSaved,
}: Props) {
  const parsed = parsePostalCity(sellerPostalCity);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sellerName);
  const [address, setAddress] = useState(sellerAddress);
  const [zipcode, setZipcode] = useState(parsed?.zipcode ?? "");
  const [city, setCity] = useState(parsed?.city ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const usable = Boolean(sellerAddress) && parsed !== null;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await staffFetch(`/api/trade-in/${offerId}/seller-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_name: name, seller_address: address, zipcode, city }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Kunne ikke gemme adressen");
      else {
        setOpen(false);
        onSaved();
      }
    } catch {
      setError("Kunne ikke gemme adressen — prøv igen");
    }
    setSaving(false);
  }

  const input =
    "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10";

  if (!open) {
    return (
      <div className="mt-4 border-t border-stone-200/60 pt-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Afsenderadresse
        </p>
        {usable ? (
          <p className="text-sm text-charcoal">
            {sellerName}
            <br />
            <span className="text-stone-500">
              {sellerAddress}, {sellerPostalCity}
            </span>
          </p>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            Adressen kan ikke bruges til en label
            {sellerPostalCity ? ` — postnummeret står som "${sellerPostalCity}"` : ""}. Ret den her,
            så kan e-labelen genereres.
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-[13px] text-charcoal/45 underline hover:text-charcoal"
        >
          Ret adresse
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-stone-200/60 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
        Ret afsenderadresse
      </p>

      <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn" />
      <input
        className={input}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Gadenavn og nr."
      />
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <input
          className={input}
          value={zipcode}
          onChange={(e) => setZipcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="4200"
        />
        <input
          className={input}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="By (udfyldes selv, hvis den er tom)"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-full bg-green-eco px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Gemmer..." : "Gem adresse"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] text-charcoal/40 underline"
        >
          Fortryd
        </button>
      </div>
    </div>
  );
}
