"use client";

import { useState } from "react";
import type {
  Customer,
  CustomerDevice,
  ChecklistItem,
} from "@/lib/supabase/types";
import { CustomerStep } from "./steps/customer-step";
import { DeviceStep } from "./steps/device-step";
import { RepairStep } from "./steps/repair-step";
import { SummaryStep } from "./steps/summary-step";

export interface IntakeFormData {
  // Step 1
  customer: Customer | null;
  isNewCustomer: boolean;
  // Step 2
  device: CustomerDevice | null;
  isNewDevice: boolean;
  newDevice: {
    brand: string;
    model: string;
    serial_number: string;
    color: string;
  };
  checklist: ChecklistItem[];
  intakePhotos: string[];
  // Step 3
  selectedServices: { id: string; name: string; price_dkk: number }[];
  customServices: { name: string; price_dkk: number }[];
  internalNotes: string;
  // Step 4
  createShopifyPayment: boolean;
  sendSms: boolean;
  sendEmail: boolean;
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { label: "Skaerm (ridser/revner/dead pixels)", status: "ok", note: "", photo_url: null },
  { label: "Bagside/ramme (buler/ridser)", status: "ok", note: "", photo_url: null },
  { label: "Kamera (virker/ridset)", status: "ok", note: "", photo_url: null },
  { label: "Opladning", status: "ok", note: "", photo_url: null },
  { label: "Lyd/hoejttaler", status: "ok", note: "", photo_url: null },
  { label: "Knapper", status: "ok", note: "", photo_url: null },
  { label: "Vandskade-indikator", status: "ok", note: "", photo_url: null },
  { label: "Batteri health", status: "ok", note: "", photo_url: null },
  { label: "Find My / iCloud", status: "ok", note: "", photo_url: null },
  { label: "Adgangskode modtaget", status: "ok", note: "", photo_url: null },
  { label: "Tilbehoer indleveret", status: "ok", note: "", photo_url: null },
];

const INITIAL_FORM_DATA: IntakeFormData = {
  customer: null,
  isNewCustomer: false,
  device: null,
  isNewDevice: true,
  newDevice: { brand: "", model: "", serial_number: "", color: "" },
  checklist: INITIAL_CHECKLIST,
  intakePhotos: [],
  selectedServices: [],
  customServices: [],
  internalNotes: "",
  createShopifyPayment: true,
  sendSms: true,
  sendEmail: true,
};

const STEPS = [
  { num: 1, label: "Kunde" },
  { num: 2, label: "Enhed" },
  { num: 3, label: "Reparation" },
  { num: 4, label: "Opsummering" },
];

export default function IntakePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<IntakeFormData>(INITIAL_FORM_DATA);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  function updateFormData(partial: Partial<IntakeFormData>) {
    setFormData((prev) => ({ ...prev, ...partial }));
  }

  function handleReset() {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setSubmittedTicketId(null);
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">
        Ny indlevering
      </h2>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                currentStep === step.num
                  ? "bg-green-eco text-white"
                  : currentStep > step.num
                    ? "bg-green-eco/20 text-green-eco"
                    : "bg-soft-grey text-gray"
              }`}
            >
              {currentStep > step.num ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep >= step.num ? "text-charcoal" : "text-gray"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px w-8 bg-soft-grey" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <CustomerStep
          formData={formData}
          updateFormData={updateFormData}
          onNext={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 2 && (
        <DeviceStep
          formData={formData}
          updateFormData={updateFormData}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <RepairStep
          formData={formData}
          updateFormData={updateFormData}
          onNext={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && (
        <SummaryStep
          formData={formData}
          updateFormData={updateFormData}
          onBack={() => setCurrentStep(3)}
          onSubmitted={(ticketId) => setSubmittedTicketId(ticketId)}
          submittedTicketId={submittedTicketId}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
