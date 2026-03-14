"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CustomerDevice } from "@/lib/supabase/types";
import type { IntakeFormData } from "../page";
import { Checklist } from "./checklist";

interface Props {
  formData: IntakeFormData;
  updateFormData: (partial: Partial<IntakeFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DeviceStep({ formData, updateFormData, onNext, onBack }: Props) {
  const [existingDevices, setExistingDevices] = useState<CustomerDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    if (!formData.customer) return;
    setLoadingDevices(true);
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const r = await fetch(`/api/customers/${formData.customer!.id}`, { headers });
        const data = await r.json();
        if (data.customer_devices) {
          setExistingDevices(data.customer_devices);
        }
      } catch {
        // ignore
      } finally {
        setLoadingDevices(false);
      }
    })();
  }, [formData.customer]);

  function selectExistingDevice(device: CustomerDevice) {
    updateFormData({ device, isNewDevice: false });
  }

  function updateNewDevice(field: string, value: string) {
    updateFormData({
      newDevice: { ...formData.newDevice, [field]: value },
      isNewDevice: true,
      device: null,
    });
  }

  const hasDevice =
    formData.device !== null ||
    (formData.isNewDevice && formData.newDevice.brand.trim() && formData.newDevice.model.trim());

  return (
    <div className="max-w-2xl">
      {/* Existing devices */}
      {existingDevices.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-charcoal">
            Kundens enheder
          </p>
          {loadingDevices ? (
            <p className="text-sm text-gray">Indlaeser...</p>
          ) : (
            <div className="grid gap-2">
              {existingDevices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectExistingDevice(d)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    formData.device?.id === d.id
                      ? "border-green-eco bg-green-eco/5"
                      : "border-soft-grey bg-white hover:bg-sand"
                  }`}
                >
                  <p className="font-semibold text-charcoal">
                    {d.brand} {d.model}
                  </p>
                  <p className="text-sm text-gray">
                    {d.color && `${d.color} · `}
                    {d.serial_number && `S/N: ${d.serial_number}`}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="my-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-soft-grey" />
            <span className="text-sm text-gray">eller registrer ny</span>
            <div className="h-px flex-1 bg-soft-grey" />
          </div>
        </div>
      )}

      {/* New device form */}
      <div className="mb-6 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-4 font-semibold text-charcoal">
          {existingDevices.length > 0 ? "Ny enhed" : "Enhed"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">
              Brand *
            </label>
            <input
              type="text"
              value={formData.newDevice.brand}
              onChange={(e) => updateNewDevice("brand", e.target.value)}
              placeholder="f.eks. Apple, Samsung"
              className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">
              Model *
            </label>
            <input
              type="text"
              value={formData.newDevice.model}
              onChange={(e) => updateNewDevice("model", e.target.value)}
              placeholder="f.eks. iPhone 15 Pro"
              className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">
              Serienummer
            </label>
            <input
              type="text"
              value={formData.newDevice.serial_number}
              onChange={(e) => updateNewDevice("serial_number", e.target.value)}
              className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">
              Farve
            </label>
            <input
              type="text"
              value={formData.newDevice.color}
              onChange={(e) => updateNewDevice("color", e.target.value)}
              className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <Checklist formData={formData} updateFormData={updateFormData} />

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-soft-grey px-6 py-3 text-sm font-medium text-charcoal hover:bg-sand"
        >
          Tilbage
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasDevice}
          className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Naeste: Reparation
        </button>
      </div>
    </div>
  );
}
