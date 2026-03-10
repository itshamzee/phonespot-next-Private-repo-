"use client";

import { useState } from "react";

export interface PDFPreviewData {
  ticketId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName?: string;
  cvr?: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  deviceColor?: string;
  conditionNotes?: string;
  services: { name: string; price: number }[];
  internalNotes: string;
  checklist?: { label: string; status: string }[];
}

export interface PDFPreviewModalProps {
  type: "intake-receipt" | "workshop-report";
  data: PDFPreviewData;
  onClose: () => void;
}

export function PDFPreviewModal({ type, data, onClose }: PDFPreviewModalProps) {
  const [customerName, setCustomerName] = useState(data.customerName);
  const [customerPhone, setCustomerPhone] = useState(data.customerPhone);
  const [customerEmail, setCustomerEmail] = useState(data.customerEmail);
  const [companyName, setCompanyName] = useState(data.companyName ?? "");
  const [cvr, setCvr] = useState(data.cvr ?? "");
  const [deviceBrand, setDeviceBrand] = useState(data.deviceBrand);
  const [deviceModel, setDeviceModel] = useState(data.deviceModel);
  const [serialNumber, setSerialNumber] = useState(data.serialNumber ?? "");
  const [deviceColor, setDeviceColor] = useState(data.deviceColor ?? "");
  const [services, setServices] = useState(
    data.services.map((s) => ({ name: s.name, price: s.price })),
  );
  const [internalNotes, setInternalNotes] = useState(data.internalNotes);
  const [generating, setGenerating] = useState(false);

  const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0);

  const typeLabel =
    type === "intake-receipt" ? "Indleveringsbevis" : "Vaerkstedsrapport";

  function updateService(index: number, field: "name" | "price", value: string) {
    setServices((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, [field]: field === "price" ? Number(value) || 0 : value }
          : s,
      ),
    );
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function addService() {
    setServices((prev) => [...prev, { name: "", price: 0 }]);
  }

  async function handleGenerate() {
    setGenerating(true);

    try {
      const body: PDFPreviewData = {
        ticketId: data.ticketId,
        customerName,
        customerPhone,
        customerEmail,
        companyName: companyName || undefined,
        cvr: cvr || undefined,
        deviceBrand,
        deviceModel,
        serialNumber: serialNumber || undefined,
        deviceColor: deviceColor || undefined,
        services,
        internalNotes,
        checklist: data.checklist,
      };

      const res = await fetch(`/api/pdf/${type}/${data.ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      // Silently handle — user sees no PDF tab open
    }

    setGenerating(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-soft-grey bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-soft-grey px-6 py-4">
          <h2 className="font-display text-lg font-bold text-charcoal">
            {typeLabel} — Forhåndsvisning
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray hover:text-charcoal"
            aria-label="Luk"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Customer fields */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              Kunde
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-name" className="text-xs text-gray">Navn</label>
                <input
                  id="pdf-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-phone" className="text-xs text-gray">Telefon</label>
                <input
                  id="pdf-phone"
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-email" className="text-xs text-gray">Email</label>
                <input
                  id="pdf-email"
                  type="text"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-company" className="text-xs text-gray">Firma</label>
                <input
                  id="pdf-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-cvr" className="text-xs text-gray">CVR</label>
                <input
                  id="pdf-cvr"
                  type="text"
                  value={cvr}
                  onChange={(e) => setCvr(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
            </div>
          </fieldset>

          {/* Device fields */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              Enhed
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-brand" className="text-xs text-gray">Maerke</label>
                <input
                  id="pdf-brand"
                  type="text"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-model" className="text-xs text-gray">Model</label>
                <input
                  id="pdf-model"
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-serial" className="text-xs text-gray">Serienummer</label>
                <input
                  id="pdf-serial"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pdf-color" className="text-xs text-gray">Farve</label>
                <input
                  id="pdf-color"
                  type="text"
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  className="rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
            </div>
          </fieldset>

          {/* Services */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              Reparationer
            </legend>
            <div className="space-y-2">
              {services.map((service, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateService(i, "name", e.target.value)}
                    placeholder="Ydelse"
                    className="min-w-0 flex-1 rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                  <input
                    type="number"
                    value={service.price || ""}
                    onChange={(e) => updateService(i, "price", e.target.value)}
                    placeholder="Pris"
                    className="w-24 rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                  <span className="text-xs text-gray">DKK</span>
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="shrink-0 text-gray hover:text-red-500"
                    aria-label="Fjern ydelse"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addService}
                className="text-sm font-medium text-green-eco hover:underline"
              >
                + Tilfoej ydelse
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-soft-grey pt-2">
              <span className="text-sm font-semibold text-charcoal">Total</span>
              <span className="text-sm font-bold text-green-eco">
                {totalPrice} DKK
              </span>
            </div>
          </fieldset>

          {/* Internal notes */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              Interne noter
            </legend>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Interne noter..."
              className="w-full rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-soft-grey px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-soft-grey px-6 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-sand"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-full bg-green-eco px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {generating ? "Genererer..." : "Generer PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
