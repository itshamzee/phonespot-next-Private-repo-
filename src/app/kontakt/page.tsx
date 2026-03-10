"use client";

import { useState } from "react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { FormField } from "@/components/ui/form-field";
import { STORE } from "@/lib/store-config";

type Status = "idle" | "submitting" | "success" | "error";

export default function KontaktPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "Support",
    message: "",
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }

      setStatus("success");
      setFormData({ name: "", email: "", subject: "Support", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Kunne ikke sende besked",
      );
    }
  }

  return (
    <SectionWrapper>
      <Heading as="h1" size="lg">
        Kontakt os
      </Heading>
      <p className="mt-4 mb-10 max-w-2xl text-gray">
        Har du spørgsmål til en ordre, et produkt eller vores
        reparationsservice? Udfyld formularen herunder, eller kontakt os
        direkte på e-mail. Vi bestræber os på at svare inden for 24 timer.
      </p>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Contact form */}
        <div className="lg:col-span-2">
          {status === "success" ? (
            <div className="rounded-2xl border border-green-eco/30 bg-green-pale p-8 text-center">
              <p className="text-lg font-semibold text-charcoal">
                Tak for din besked!
              </p>
              <p className="mt-2 text-gray">
                Vi vender tilbage hurtigst muligt.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-6 rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Send en ny besked
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
                  label="Emne"
                  name="subject"
                  type="select"
                  options={["Support", "Salg", "Andet"]}
                  placeholder="Vælg emne..."
                  value={formData.subject}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-6">
                <FormField
                  label="Besked"
                  name="message"
                  type="textarea"
                  required
                  placeholder="Skriv din besked her..."
                  value={formData.message}
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
                  {status === "submitting" ? "Sender..." : "Send besked"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Side info card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-soft-grey bg-white p-6 md:p-8">
            <Heading as="h2" size="sm" className="mb-6">
              Kontaktoplysninger
            </Heading>

            <div className="flex flex-col gap-6">
              {/* Email */}
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">Email</p>
                  <a
                    href="mailto:info@phonespot.dk"
                    className="text-sm text-green-eco hover:underline"
                  >
                    info@phonespot.dk
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">Adresse</p>
                  <p className="text-sm text-gray">
                    {STORE.company}
                    <br />
                    {STORE.street}
                    <br />
                    {STORE.zip} {STORE.city}
                  </p>
                </div>
              </div>

              {/* Opening hours */}
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    Åbningstider
                  </p>
                  <p className="text-sm text-gray">
                    Man – Fre: {STORE.hours.weekdays}
                    <br />
                    Lørdag: {STORE.hours.saturday}
                    <br />
                    Søndag: {STORE.hours.sunday}
                  </p>
                </div>
              </div>
            </div>

            {/* Response time note */}
            <div className="mt-8 rounded-lg bg-green-pale p-4">
              <p className="text-sm text-charcoal">
                Vi bestræber os på at svare på alle henvendelser inden for{" "}
                <span className="font-semibold">24 timer</span> på hverdage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
