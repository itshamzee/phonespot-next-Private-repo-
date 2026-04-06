"use client";

import { useState } from "react";
import Link from "next/link";

interface FormState {
  companyName: string;
  cvrNummer: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
}

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20 bg-white";

const LABEL_CLASS = "block text-sm font-medium text-[#111111]";

const USP_ITEMS = [
  {
    title: "Engros-priser",
    description: "Adgang til priser reserveret til forhandlere og reparationsvaerksteder.",
  },
  {
    title: "Bredt sortiment",
    description: "Reservedele til alle store brands — iPhone, Samsung, iPad og meget mere.",
  },
  {
    title: "Hurtig levering",
    description: "Forsendelse same-day pa ordrer modtaget inden kl. 14:00 pa hverdage.",
  },
  {
    title: "Garanti pa dele",
    description: "12 maaneders garanti pa alle reservedele til erhvervskunder.",
  },
];

export default function B2BRegistrationPage() {
  const [form, setForm] = useState<FormState>({
    companyName: "",
    cvrNummer: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.passwordConfirm) {
      setError("Adgangskoderne stemmer ikke overens");
      return;
    }
    if (form.password.length < 8) {
      setError("Adgangskode skal vaere mindst 8 tegn");
      return;
    }
    if (!/^\d{8}$/.test(form.cvrNummer)) {
      setError("CVR-nummer skal vaere praecis 8 cifre");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/b2b/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          cvrNummer: form.cvrNummer,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Noget gik galt. Prov igen.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Netvaerksfejl. Kontroller din forbindelse og prov igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#1A3D2E]/10">
            <svg className="h-8 w-8 text-[#1A3D2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold text-[#111111]">
            Ansogning modtaget
          </h1>
          <p className="mb-6 text-[#86868B]">
            Din ansogning er modtaget. Vi tager kontakt inden for 24 timer for at verificere din virksomhed og aktivere din konto.
          </p>
          <p className="mb-8 text-sm text-[#86868B]">
            Har du spoergsmaal? Kontakt os pa{" "}
            <a href="mailto:b2b@phonespot.dk" className="text-[#1A3D2E] underline underline-offset-2">
              b2b@phonespot.dk
            </a>
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Tilbage til forsiden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <div className="mx-auto max-w-5xl px-4 py-12 lg:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#1A3D2E]">
            B2B / Forhandler
          </p>
          <h1 className="font-display text-3xl font-bold text-[#111111] lg:text-4xl">
            Bliv forhandler hos PhoneSpot
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[#86868B]">
            Fa adgang til engros-priser pa reservedele til alle enheder. Udfyld formularen nedenfor — vi godkender din konto inden for 24 timer.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Registration form */}
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-6 lg:p-8">
            <h2 className="mb-6 text-base font-semibold text-[#111111]">Virksomhedsoplysninger</h2>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Company name + CVR side by side on wider screens */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-companyName" className={LABEL_CLASS}>
                    Firmanavn <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-companyName"
                    type="text"
                    required
                    autoComplete="organization"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="PhoneRepair ApS"
                  />
                </div>
                <div>
                  <label htmlFor="reg-cvr" className={LABEL_CLASS}>
                    CVR-nummer <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-cvr"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={8}
                    pattern="\d{8}"
                    autoComplete="off"
                    value={form.cvrNummer}
                    onChange={(e) => update("cvrNummer", e.target.value.replace(/\D/g, ""))}
                    className={FIELD_CLASS}
                    placeholder="12345678"
                  />
                  <p className="mt-1 text-xs text-[#86868B]">8 cifre uden mellemrum</p>
                </div>
              </div>

              <div>
                <label htmlFor="reg-contactName" className={LABEL_CLASS}>
                  Kontaktperson <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-contactName"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="Fornavn Efternavn"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-email" className={LABEL_CLASS}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="kontakt@virksomhed.dk"
                  />
                </div>
                <div>
                  <label htmlFor="reg-phone" className={LABEL_CLASS}>
                    Telefon
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="+45 00 00 00 00"
                  />
                </div>
              </div>

              <div className="border-t border-[#E5E5EA] pt-4">
                <h3 className="mb-4 text-sm font-semibold text-[#111111]">Adgangskode</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-password" className={LABEL_CLASS}>
                      Adgangskode <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      className={FIELD_CLASS}
                      placeholder="Mindst 8 tegn"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-passwordConfirm" className={LABEL_CLASS}>
                      Bekraeft adgangskode <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reg-passwordConfirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={form.passwordConfirm}
                      onChange={(e) => update("passwordConfirm", e.target.value)}
                      className={FIELD_CLASS}
                      placeholder="Gentag adgangskode"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[#1A3D2E] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Sender ansogning..." : "Ansog om erhvervskonto"}
                </button>
              </div>

              <p className="text-center text-xs text-[#86868B]">
                Ansogninger behandles inden for 24 timer. Alle priser er ekskl. moms for godkendte erhvervskunder.
              </p>

              <p className="text-center text-sm text-[#86868B]">
                Har du allerede en konto?{" "}
                <Link href="/b2b/login" className="font-medium text-[#1A3D2E] hover:underline">
                  Log ind her
                </Link>
              </p>
            </form>
          </div>

          {/* USP sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E5E5EA] bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#86868B]">
                Hvorfor PhoneSpot B2B?
              </h3>
              <ul className="space-y-4">
                {USP_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10">
                      <svg className="h-3 w-3 text-[#1A3D2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                      <p className="text-xs text-[#86868B]">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E5E5EA] bg-[#1A3D2E] p-6 text-white">
              <p className="mb-1 text-sm font-semibold">Spoergsmaal?</p>
              <p className="mb-4 text-xs text-white/70">
                Vores B2B-team sidder klar til at hjaelpe dig med oprettelse og priser.
              </p>
              <a
                href="mailto:b2b@phonespot.dk"
                className="block rounded-full border border-white/30 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                b2b@phonespot.dk
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
