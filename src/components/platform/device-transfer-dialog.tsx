"use client";

import { useState, useEffect } from "react";

interface Location {
  id: string;
  name: string;
}

interface TransferDevice {
  id: string;
  barcode: string;
  templateName: string;
  locationId: string;
  locationName: string;
}

interface DeviceTransferDialogProps {
  device: TransferDevice | null;
  open: boolean;
  onClose: () => void;
  onTransferred: () => void;
}

export function DeviceTransferDialog({
  device,
  open,
  onClose,
  onTransferred,
}: DeviceTransferDialogProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [toLocationId, setToLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch locations whenever dialog opens
  useEffect(() => {
    if (!open) return;
    async function fetchLocations() {
      try {
        const res = await fetch("/api/platform/locations");
        if (res.ok) {
          const data: Location[] = await res.json();
          setLocations(data);
        }
      } catch {
        // silently fail
      }
    }
    fetchLocations();
    // Reset form fields
    setToLocationId("");
    setReason("");
    setError(null);
  }, [open]);

  if (!open || !device) return null;

  const availableLocations = locations.filter((loc) => loc.id !== device.locationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toLocationId) {
      setError("Vælg en destinationslokation");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: device!.id,
          to_location_id: toLocationId,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Serverfejl (${res.status})`);
      }
      onTransferred();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Overførslen mislykkedes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Overfør enhed"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-base font-bold text-stone-800">Overfør enhed</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Device info */}
        <div className="mx-6 mt-4 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Enhed</p>
          <p className="mt-1 font-semibold text-stone-800">{device.templateName}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
            <span>
              Stregkode:{" "}
              <span className="font-mono text-stone-700">{device.barcode}</span>
            </span>
            <span className="text-stone-300">·</span>
            <span>
              Fra:{" "}
              <span className="font-medium text-stone-700">{device.locationName}</span>
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* Destination */}
          <div>
            <label
              htmlFor="to_location"
              className="mb-1.5 block text-sm font-semibold text-stone-700"
            >
              Destination <span className="text-red-500">*</span>
            </label>
            {availableLocations.length === 0 ? (
              <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-400">
                {locations.length === 0
                  ? "Henter lokationer…"
                  : "Ingen andre lokationer tilgængelige"}
              </p>
            ) : (
              <select
                id="to_location"
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
              >
                <option value="">Vælg lokation…</option>
                {availableLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-semibold text-stone-700"
            >
              Årsag <span className="text-stone-400 font-normal">(valgfri)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Fx. 'Overføres til showroom', 'Reparation', …"
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-40"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={submitting || !toLocationId}
              className="inline-flex items-center gap-2 rounded-xl bg-green-eco px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Overfører…
                </>
              ) : (
                "Overfør"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
