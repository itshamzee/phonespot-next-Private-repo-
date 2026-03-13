"use client";

import { useState } from "react";
import type { DraftOrder, DraftLineItem } from "@/lib/supabase/platform-types";
import { LineItemEditor } from "@/components/platform/line-item-editor";
import { parseDKKToOere } from "@/lib/platform/format";

interface Props {
  draft?: DraftOrder | null;
  onSave: () => void;
  onCancel: () => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </h3>
  );
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
      {children}
      {optional && (
        <span className="ml-1 text-xs font-normal text-stone-400">(valgfrit)</span>
      )}
    </label>
  );
}

export function DraftOrderForm({ draft, onSave, onCancel }: Props) {
  const isEdit = !!draft;

  // Customer
  const [email, setEmail] = useState(draft?.customer_email ?? "");
  const [name, setName] = useState(draft?.customer_name ?? "");

  // Line items
  const [lineItems, setLineItems] = useState<DraftLineItem[]>(draft?.line_items ?? []);

  // Discount & shipping (stored as øre, displayed as DKK string)
  const [discountStr, setDiscountStr] = useState(
    draft?.discount_amount ? String(draft.discount_amount / 100).replace(".", ",") : "",
  );
  const [shippingStr, setShippingStr] = useState(
    draft?.shipping_cost ? String(draft.shipping_cost / 100).replace(".", ",") : "",
  );

  // Notes
  const [internalNote, setInternalNote] = useState(draft?.internal_note ?? "");
  const [customerNote, setCustomerNote] = useState(draft?.customer_note ?? "");

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(draft?.payment_url ?? null);

  function buildPayload() {
    const discountAmount = parseDKKToOere(discountStr) ?? 0;
    const shippingCost = parseDKKToOere(shippingStr) ?? 0;
    const subtotal = lineItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const taxAmount = lineItems.reduce(
      (s, i) => s + Math.round((i.unit_price * i.quantity * i.tax_rate) / (100 + i.tax_rate)),
      0,
    );
    const total = subtotal + shippingCost - discountAmount;

    return {
      customer_email: email || null,
      customer_name: name || null,
      line_items: lineItems,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      subtotal,
      tax_amount: taxAmount,
      total,
      internal_note: internalNote || null,
      customer_note: customerNote || null,
    };
  }

  async function saveDraft(): Promise<DraftOrder | null> {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/platform/draft-orders/${draft.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/platform/draft-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as DraftOrder;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukendt fejl");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const saved = await saveDraft();
    if (saved) onSave();
  }

  async function handleSendInvoice() {
    const saved = await saveDraft();
    if (!saved) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/platform/draft-orders/${saved.id}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPaymentUrl(data.payment_url ?? data.draft?.payment_url ?? null);
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke sende faktura");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid() {
    if (!isEdit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/draft-orders/${draft.id}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke markere som betalt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Payment URL banner */}
      {paymentUrl && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <p className="font-medium text-green-800">Faktura sendt</p>
          <p className="mt-1 text-green-700 break-all">
            Betalingslink:{" "}
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-900"
            >
              {paymentUrl}
            </a>
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Customer */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <SectionHeading>Kunde</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@eksempel.dk"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
          </div>
          <div>
            <FieldLabel htmlFor="name">Navn</FieldLabel>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fulde navn"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <SectionHeading>Linjer</SectionHeading>
        <LineItemEditor items={lineItems} onChange={setLineItems} />
      </div>

      {/* Discount & shipping */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <SectionHeading>Rabat &amp; forsendelse</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="discount" optional>
              Rabat (kr.)
            </FieldLabel>
            <input
              id="discount"
              type="text"
              inputMode="decimal"
              value={discountStr}
              onChange={(e) => setDiscountStr(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
          </div>
          <div>
            <FieldLabel htmlFor="shipping" optional>
              Forsendelse (kr.)
            </FieldLabel>
            <input
              id="shipping"
              type="text"
              inputMode="decimal"
              value={shippingStr}
              onChange={(e) => setShippingStr(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <SectionHeading>Noter</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="internalNote" optional>
              Intern note
            </FieldLabel>
            <textarea
              id="internalNote"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={4}
              placeholder="Synlig kun for personale…"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10 resize-none"
            />
          </div>
          <div>
            <FieldLabel htmlFor="customerNote" optional>
              Kundenote
            </FieldLabel>
            <textarea
              id="customerNote"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={4}
              placeholder="Vises på fakturaen…"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Gemmer…" : "Gem kladde"}
        </button>
        <button
          type="button"
          onClick={handleSendInvoice}
          disabled={saving}
          className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Sender…" : "Send faktura"}
        </button>
        {isEdit && draft.status !== "paid" && draft.status !== "cancelled" && (
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={saving}
            className="rounded-xl border border-green-300 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            Marker som betalt
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          Annuller
        </button>
      </div>
    </div>
  );
}
