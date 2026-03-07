"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { IntakeFormData } from "../page";

interface AvailableService {
  id: string;
  name: string;
  price_dkk: number;
}

interface Props {
  formData: IntakeFormData;
  updateFormData: (partial: Partial<IntakeFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RepairStep({ formData, updateFormData, onNext, onBack }: Props) {
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([]);
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const supabase = createBrowserClient();

  // Look up services based on brand/model
  useEffect(() => {
    const brand = formData.device?.brand || formData.newDevice.brand;
    const model = formData.device?.model || formData.newDevice.model;

    if (!brand || !model) return;

    setLoading(true);

    async function lookupServices() {
      // Find matching brand
      const { data: brands } = await supabase
        .from("repair_brands")
        .select("id, name")
        .ilike("name", `%${brand}%`)
        .limit(1);

      if (!brands || brands.length === 0) {
        setLoading(false);
        return;
      }

      // Find matching model
      const { data: models } = await supabase
        .from("repair_models")
        .select("id, name")
        .eq("brand_id", brands[0].id)
        .ilike("name", `%${model}%`)
        .limit(1);

      if (!models || models.length === 0) {
        setLoading(false);
        return;
      }

      // Get services for this model
      const { data: services } = await supabase
        .from("repair_services")
        .select("id, name, price_dkk")
        .eq("model_id", models[0].id)
        .eq("active", true)
        .order("sort_order");

      setAvailableServices(
        (services ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          price_dkk: s.price_dkk,
        })),
      );
      setLoading(false);
    }

    lookupServices();
  }, [formData.device, formData.newDevice.brand, formData.newDevice.model, supabase]);

  function toggleService(service: AvailableService) {
    const exists = formData.selectedServices.some((s) => s.id === service.id);
    if (exists) {
      updateFormData({
        selectedServices: formData.selectedServices.filter((s) => s.id !== service.id),
      });
    } else {
      updateFormData({
        selectedServices: [...formData.selectedServices, service],
      });
    }
  }

  function addCustomService() {
    if (!customName.trim() || !customPrice) return;
    updateFormData({
      customServices: [
        ...formData.customServices,
        { name: customName.trim(), price_dkk: Number(customPrice) },
      ],
    });
    setCustomName("");
    setCustomPrice("");
  }

  function removeCustomService(index: number) {
    updateFormData({
      customServices: formData.customServices.filter((_, i) => i !== index),
    });
  }

  const totalPrice =
    formData.selectedServices.reduce((sum, s) => sum + s.price_dkk, 0) +
    formData.customServices.reduce((sum, s) => sum + s.price_dkk, 0);

  const hasServices = formData.selectedServices.length > 0 || formData.customServices.length > 0;

  return (
    <div className="max-w-2xl">
      {/* Available services from prisliste */}
      <div className="mb-6 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-4 font-semibold text-charcoal">
          Tilgaengelige reparationer
        </h3>

        {loading ? (
          <p className="text-sm text-gray">Soeger reparationer...</p>
        ) : availableServices.length === 0 ? (
          <p className="text-sm text-gray">
            Ingen matchende reparationer fundet i prislisten. Tilfoej en fritekst-reparation nedenfor.
          </p>
        ) : (
          <div className="grid gap-2">
            {availableServices.map((service) => {
              const isSelected = formData.selectedServices.some((s) => s.id === service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-green-eco bg-green-eco/5"
                      : "border-soft-grey hover:bg-sand"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-green-eco bg-green-eco text-white"
                          : "border-gray"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-charcoal">{service.name}</span>
                  </div>
                  <span className="font-bold text-charcoal">{service.price_dkk} DKK</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom service */}
      <div className="mb-6 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-4 font-semibold text-charcoal">
          Fritekst-reparation
        </h3>

        {formData.customServices.length > 0 && (
          <div className="mb-4 grid gap-2">
            {formData.customServices.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-soft-grey p-3"
              >
                <span className="text-sm text-charcoal">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-charcoal">{s.price_dkk} DKK</span>
                  <button
                    type="button"
                    onClick={() => removeCustomService(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Reparation..."
            className="min-w-0 flex-1 rounded-lg border border-soft-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none"
          />
          <input
            type="number"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="Pris DKK"
            className="w-28 rounded-lg border border-soft-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomService}
            disabled={!customName.trim() || !customPrice}
            className="rounded-lg bg-charcoal px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Tilfoej
          </button>
        </div>
      </div>

      {/* Internal notes */}
      <div className="mb-6 rounded-2xl border border-soft-grey bg-white p-5">
        <h3 className="mb-2 font-semibold text-charcoal">
          Interne noter (til vaerkstedet)
        </h3>
        <textarea
          rows={3}
          value={formData.internalNotes}
          onChange={(e) => updateFormData({ internalNotes: e.target.value })}
          placeholder="Evt. noter til teknikeren..."
          className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      {/* Total */}
      {hasServices && (
        <div className="mb-6 rounded-2xl border border-green-eco/30 bg-green-eco/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-charcoal">Total</span>
            <span className="text-2xl font-bold text-green-eco">{totalPrice} DKK</span>
          </div>
        </div>
      )}

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
          disabled={!hasServices}
          className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Naeste: Opsummering
        </button>
      </div>
    </div>
  );
}
