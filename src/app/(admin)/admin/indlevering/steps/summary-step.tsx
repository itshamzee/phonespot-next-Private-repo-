"use client";

import { useState } from "react";
import Link from "next/link";
import type { IntakeFormData } from "../page";

interface Props {
  formData: IntakeFormData;
  updateFormData: (partial: Partial<IntakeFormData>) => void;
  onBack: () => void;
  onSubmitted: (ticketId: string) => void;
  submittedTicketId: string | null;
  onReset: () => void;
}

export function SummaryStep({
  formData,
  updateFormData,
  onBack,
  onSubmitted,
  submittedTicketId,
  onReset,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const allServices = [
    ...formData.selectedServices.map((s) => ({ name: s.name, price_dkk: s.price_dkk })),
    ...formData.customServices,
  ];
  const totalPrice = allServices.reduce((sum, s) => sum + s.price_dkk, 0);

  const deviceName = formData.device
    ? `${formData.device.brand} ${formData.device.model}`
    : `${formData.newDevice.brand} ${formData.newDevice.model}`;

  const faultItems = formData.checklist.filter((c) => c.status === "fejl");

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: formData.customer,
          device: formData.device,
          isNewDevice: formData.isNewDevice,
          newDevice: formData.newDevice,
          checklist: formData.checklist,
          intakePhotos: formData.intakePhotos,
          selectedServices: formData.selectedServices,
          customServices: formData.customServices,
          internalNotes: formData.internalNotes,
          createShopifyPayment: formData.createShopifyPayment,
          sendSms: formData.sendSms,
          sendEmail: formData.sendEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kunne ikke oprette sag");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      onSubmitted(data.ticketId);
    } catch {
      setError("Netvaerksfejl");
    }
    setSubmitting(false);
  }

  if (submittedTicketId) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-green-eco/30 bg-green-eco/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-charcoal">
            Sag oprettet!
          </h3>
          <p className="mb-6 text-sm text-gray">
            Sags-ID: {submittedTicketId.slice(0, 8)}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`/api/pdf/intake-receipt/${submittedTicketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-charcoal px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Download indleveringsbevis
            </a>
            <a
              href={`/api/pdf/workshop-report/${submittedTicketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-soft-grey bg-white px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-sand"
            >
              Download vaerkstedsrapport
            </a>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/admin/reparationer/${submittedTicketId}`}
              className="text-sm font-medium text-green-eco hover:underline"
            >
              Gaa til sag
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="text-sm font-medium text-gray hover:text-charcoal"
            >
              Ny indlevering
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Customer summary */}
      <div className="mb-4 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray">
          Kunde
        </h3>
        <p className="font-semibold text-charcoal">{formData.customer?.name}</p>
        <p className="text-sm text-gray">
          {formData.customer?.phone}
          {formData.customer?.email && ` · ${formData.customer.email}`}
        </p>
        {formData.customer?.type === "erhverv" && formData.customer.company_name && (
          <p className="text-sm text-gray">
            {formData.customer.company_name}
            {formData.customer.cvr && ` (CVR: ${formData.customer.cvr})`}
          </p>
        )}
      </div>

      {/* Device summary */}
      <div className="mb-4 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray">
          Enhed
        </h3>
        <p className="font-semibold text-charcoal">{deviceName}</p>
        {(formData.device?.serial_number || formData.newDevice.serial_number) && (
          <p className="text-sm text-gray">
            S/N: {formData.device?.serial_number || formData.newDevice.serial_number}
          </p>
        )}
        {(formData.device?.color || formData.newDevice.color) && (
          <p className="text-sm text-gray">
            Farve: {formData.device?.color || formData.newDevice.color}
          </p>
        )}

        {faultItems.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Fejl ved indlevering
            </p>
            <ul className="mt-1 space-y-0.5">
              {faultItems.map((item) => (
                <li key={item.label} className="text-sm text-red-700">
                  {item.label}
                  {item.note && ` — ${item.note}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {formData.intakePhotos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {formData.intakePhotos.map((url) => (
              <img
                key={url}
                src={url}
                alt="Check-in foto"
                className="h-16 w-16 rounded-lg border border-soft-grey object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Services summary */}
      <div className="mb-4 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray">
          Reparationer
        </h3>
        <div className="space-y-2">
          {allServices.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-charcoal">{s.name}</span>
              <span className="text-sm font-bold text-charcoal">{s.price_dkk} DKK</span>
            </div>
          ))}
          <div className="border-t border-soft-grey pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-charcoal">Total</span>
              <span className="text-lg font-bold text-green-eco">{totalPrice} DKK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal notes */}
      {formData.internalNotes && (
        <div className="mb-4 rounded-2xl border border-soft-grey bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray">
            Interne noter
          </h3>
          <p className="whitespace-pre-wrap text-sm text-charcoal">
            {formData.internalNotes}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="mb-6 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray">
          Handlinger
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.createShopifyPayment}
              onChange={(e) => updateFormData({ createShopifyPayment: e.target.checked })}
              className="h-4 w-4 rounded border-gray text-green-eco focus:ring-green-eco"
            />
            <span className="text-sm text-charcoal">Opret Shopify betaling (Draft Order)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sendSms}
              onChange={(e) => updateFormData({ sendSms: e.target.checked })}
              className="h-4 w-4 rounded border-gray text-green-eco focus:ring-green-eco"
            />
            <span className="text-sm text-charcoal">Send SMS til kunden</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sendEmail}
              onChange={(e) => updateFormData({ sendEmail: e.target.checked })}
              className="h-4 w-4 rounded border-gray text-green-eco focus:ring-green-eco"
            />
            <span className="text-sm text-charcoal">Send email til kunden</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-soft-grey px-6 py-3 text-sm font-medium text-charcoal hover:bg-sand"
        >
          Tilbage
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Opretter sag..." : "Opret sag"}
        </button>
      </div>
    </div>
  );
}
