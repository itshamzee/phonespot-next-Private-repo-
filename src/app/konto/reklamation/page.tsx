"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
};

type Reklamation = {
  id: string;
  order_number: string;
  description: string;
  contact_email: string;
  submitted_at: string;
  status: "modtaget" | "under_behandling" | "afsluttet";
};

const REKLAMATION_STATUS_LABELS: Record<string, string> = {
  modtaget: "Modtaget",
  under_behandling: "Under behandling",
  afsluttet: "Afsluttet",
};

const REKLAMATION_STATUS_COLORS: Record<string, string> = {
  modtaget: "bg-amber-50 text-amber-700 ring-amber-200",
  under_behandling: "bg-blue-50 text-blue-700 ring-blue-200",
  afsluttet: "bg-green-50 text-green-700 ring-green-200",
};

export default function ReklamationPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Local submissions list (placeholder until backend stores them)
  const [submissions, setSubmissions] = useState<Reklamation[]>([]);

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
        setOrders(data.orders ?? []);
        const email = data.customer?.email ?? "";
        setCustomerEmail(email);
        setContactEmail(email);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedOrderId) {
      setFormError("Vaelg venligst en ordre");
      return;
    }
    if (description.trim().length < 20) {
      setFormError("Beskriv venligst fejlen med mindst 20 tegn");
      return;
    }

    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmitting(false); return; }

    const selectedOrder = orders.find((o) => o.id === selectedOrderId);

    const res = await fetch("/api/reklamation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        order_id: selectedOrderId,
        description: description.trim(),
        contact_email: contactEmail,
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      // Add to local list as placeholder
      const newEntry: Reklamation = {
        id: crypto.randomUUID(),
        order_number: selectedOrder?.order_number ?? selectedOrderId,
        description: description.trim(),
        contact_email: contactEmail,
        submitted_at: new Date().toISOString(),
        status: "modtaget",
      };
      setSubmissions((prev) => [newEntry, ...prev]);
      setSelectedOrderId("");
      setDescription("");
      setFormSuccess("Din reklamation er modtaget. Vi vender tilbage hurtigst muligt.");
    } else {
      const body = await res.json().catch(() => ({}));
      setFormError(body?.error ?? "Kunne ikke sende reklamation. Prov igen.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#1A3D2E]" />
      </div>
    );
  }

  const eligibleOrders = orders.filter(
    (o) => !["cancelled", "refunded", "pending"].includes(o.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Reklamation</h1>
        <p className="mt-1 text-sm text-[#6E6E73]">
          Opret en reklamationssag pa en af dine ordrer
        </p>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-[#E5E5EA] bg-[#F5F2EC] p-5">
        <h2 className="text-sm font-semibold text-[#111111]">Om reklamationsretten</h2>
        <p className="mt-1.5 text-sm text-[#6E6E73]">
          Som forbruger har du 2 ars reklamationsret pa alle varer. Hvis du har modtaget en defekt
          vare eller en vare der ikke svarer til beskrivelsen, bedes du udfylde formularen nedenfor.
          Vi behandler alle henvendelser inden for 2 hverdage.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-[#111111]">Opret ny reklamation</h2>

        {formSuccess ? (
          <div className="rounded-lg bg-green-50 px-5 py-4 ring-1 ring-inset ring-green-200">
            <p className="text-sm font-medium text-green-800">{formSuccess}</p>
            <p className="mt-1 text-xs text-green-700">
              Vi har sendt en bekraeftelse til {contactEmail}
            </p>
            <button
              onClick={() => setFormSuccess("")}
              className="mt-3 text-xs font-medium text-green-800 underline"
            >
              Opret endnu en reklamation
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111]">
                Ordre
              </label>
              {eligibleOrders.length === 0 ? (
                <p className="mt-1.5 text-sm text-[#6E6E73]">
                  Du har ingen eligible ordrer at reklamere pa.
                </p>
              ) : (
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                >
                  <option value="">Vaelg en ordre...</option>
                  {eligibleOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} —{" "}
                      {new Date(o.created_at).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111]">
                Beskrivelse af fejl
              </label>
              <p className="mt-0.5 text-xs text-[#6E6E73]">
                Beskriv fejlen sa detaljeret som muligt (hvad sker der, hvornaar sker det, osv.)
              </p>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Eks: Skermen flimrer efter 3 ugers brug. Problemet opstar nar telefonen er under 20% batteri..."
                className="mt-1.5 w-full resize-none rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              />
              <p className="mt-1 text-right text-xs text-[#AEAEB2]">
                {description.length} tegn (min. 20)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111]">
                Kontakt-email
              </label>
              <input
                required
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              />
              <p className="mt-1 text-xs text-[#AEAEB2]">Vi svarer pa denne email</p>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || eligibleOrders.length === 0}
              className="rounded-lg bg-[#1A3D2E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143324] disabled:opacity-50"
            >
              {submitting ? "Sender..." : "Send reklamation"}
            </button>
          </form>
        )}
      </div>

      {/* Previous submissions */}
      {submissions.length > 0 && (
        <div className="rounded-xl border border-[#E5E5EA] bg-white">
          <div className="border-b border-[#E5E5EA] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#111111]">Tidligere reklamationer</h2>
          </div>
          <ul className="divide-y divide-[#E5E5EA]">
            {submissions.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#111111]">Ordre {s.order_number}</p>
                    <p className="mt-0.5 text-xs text-[#6E6E73]">
                      Indsendt{" "}
                      {new Date(s.submitted_at).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-2 text-sm text-[#6E6E73] line-clamp-2">{s.description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${REKLAMATION_STATUS_COLORS[s.status] ?? "bg-[#F5F2EC] text-[#6E6E73] ring-[#E5E5EA]"}`}
                  >
                    {REKLAMATION_STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
