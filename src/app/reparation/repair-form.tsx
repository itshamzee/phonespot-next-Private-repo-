"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";

type Status = "idle" | "submitting" | "success" | "error";

const DEVICE_TYPES = ["iPhone", "iPad", "Samsung", "MacBook", "OnePlus", "Andet"];
const SERVICE_TYPES = [
  "Skaermudskiftning",
  "Batteriskift",
  "Vandskade",
  "Kamera-reparation",
  "Ladestik",
  "Andet",
];

export function RepairForm() {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    device_type: "",
    device_model: "",
    issue_description: "",
    service_type: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }

      setStatus("success");
      setFormData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        device_type: "",
        device_model: "",
        issue_description: "",
        service_type: "",
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Kunne ikke sende anmodning",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-eco/30 bg-green-pale p-8 text-center">
        <p className="text-lg font-semibold text-charcoal">
          Tak for din reparationsanmodning!
        </p>
        <p className="mt-2 text-gray">
          Vi har modtaget din sag og sender dig et tilbud hurtigst muligt. Tjek
          din email for en bekraeftelse.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Send en ny anmodning
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-soft-grey bg-white p-6 md:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="Navn"
          name="customer_name"
          type="text"
          required
          placeholder="Dit fulde navn"
          value={formData.customer_name}
          onChange={handleChange}
        />
        <FormField
          label="Email"
          name="customer_email"
          type="email"
          required
          placeholder="din@email.dk"
          value={formData.customer_email}
          onChange={handleChange}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FormField
          label="Telefon"
          name="customer_phone"
          type="tel"
          required
          placeholder="+45 XX XX XX XX"
          value={formData.customer_phone}
          onChange={handleChange}
        />
        <FormField
          label="Enhedstype"
          name="device_type"
          type="select"
          required
          options={DEVICE_TYPES}
          placeholder="Vaelg enhedstype..."
          value={formData.device_type}
          onChange={handleChange}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FormField
          label="Model"
          name="device_model"
          type="text"
          required
          placeholder="f.eks. iPhone 15 Pro Max"
          value={formData.device_model}
          onChange={handleChange}
        />
        <FormField
          label="Type reparation"
          name="service_type"
          type="select"
          required
          options={SERVICE_TYPES}
          placeholder="Vaelg reparationstype..."
          value={formData.service_type}
          onChange={handleChange}
        />
      </div>

      <div className="mt-6">
        <FormField
          label="Beskrivelse af problemet"
          name="issue_description"
          type="textarea"
          required
          placeholder="Beskriv problemet med din enhed — hvad er der sket, og hvornaar startede det?"
          value={formData.issue_description}
          onChange={handleChange}
        />
      </div>

      {status === "error" && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="mt-8">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting" ? "Sender..." : "Send reparationsanmodning"}
        </button>
      </div>
    </form>
  );
}
