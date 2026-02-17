"use client";

import { useState } from "react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { FormField } from "@/components/ui/form-field";

type Status = "idle" | "submitting" | "success" | "error";

export default function ReklamationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    orderNumber: "",
    description: "",
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
      const res = await fetch("/api/reklamation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }

      setStatus("success");
      setFormData({ name: "", email: "", orderNumber: "", description: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Kunne ikke sende reklamation",
      );
    }
  }

  return (
    <SectionWrapper>
      <Heading as="h1" size="lg">
        Reklamation
      </Heading>
      <p className="mt-4 mb-10 max-w-2xl text-gray">
        Har du modtaget en defekt vare eller oplever problemer med dit produkt?
        Udfyld formularen herunder, og vi vender tilbage inden for 2 hverdage.
      </p>

      <div className="mx-auto max-w-2xl">
        {status === "success" ? (
          <div className="rounded-2xl border border-green-eco/30 bg-green-pale p-8 text-center">
            <p className="text-lg font-semibold text-charcoal">
              Tak! Vi har modtaget din reklamation og vender tilbage inden for 2
              hverdage.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-6 rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Indsend en ny reklamation
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-soft-grey bg-white p-6 md:p-8"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                label="Navn"
                name="name"
                type="text"
                required
                placeholder="Dit fulde navn"
                value={formData.name}
                onChange={handleChange}
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                required
                placeholder="din@email.dk"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="mt-6">
              <FormField
                label="Ordrenummer"
                name="orderNumber"
                type="text"
                required
                placeholder="F.eks. #1234"
                value={formData.orderNumber}
                onChange={handleChange}
              />
            </div>

            <div className="mt-6">
              <FormField
                label="Beskrivelse af problemet"
                name="description"
                type="textarea"
                required
                placeholder="Beskriv hvad der er galt med produktet..."
                value={formData.description}
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
                {status === "submitting"
                  ? "Sender..."
                  : "Indsend reklamation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
}
