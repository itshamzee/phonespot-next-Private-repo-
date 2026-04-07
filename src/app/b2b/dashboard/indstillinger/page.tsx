"use client";

import { useState } from "react";
import { useB2B } from "@/components/b2b/b2b-context";

const FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20 disabled:bg-[#F7F7F8] disabled:text-[#86868B] disabled:cursor-not-allowed";

const PRICE_GROUP_LABELS: Record<string, string> = {
  A: "Gruppe A — Premium",
  B: "Gruppe B — Standard",
  C: "Gruppe C — Basis",
};

const PAYMENT_TERMS: Record<string, string> = {
  forudbetaling: "Forudbetaling",
  net15: "Net 15 dage",
  net30: "Net 30 dage",
};

interface NotificationPrefs {
  ordrebekraeftelser: boolean;
  forsendelsesnotifikationer: boolean;
  rmaOpdateringer: boolean;
  nyeProdukter: boolean;
}

export default function IndstillingerPage() {
  const { user } = useB2B();

  // Password change form
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Notification preferences — TODO: persist via /api/b2b/notifications-prefs
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    ordrebekraeftelser: true,
    forsendelsesnotifikationer: true,
    rmaOpdateringer: true,
    nyeProdukter: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  function handlePwField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    setPwError(null);
    setPwSuccess(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("De nye adgangskoder stemmer ikke overens.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Adgangskoden skal vaere mindst 8 tegn.");
      return;
    }

    setPwSubmitting(true);
    setPwError(null);

    // TODO: POST to /api/b2b/change-password with { currentPassword, newPassword }
    await new Promise((r) => setTimeout(r, 800));

    setPwSubmitting(false);
    setPwSuccess(true);
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  function handleNotifToggle(key: keyof NotificationPrefs) {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setNotifSaved(false);
  }

  async function handleNotifSave() {
    // TODO: PATCH /api/b2b/notification-preferences with notifPrefs
    await new Promise((r) => setTimeout(r, 400));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  }

  const priceGroupLabel = user?.priceGroup
    ? PRICE_GROUP_LABELS[user.priceGroup] ?? `Gruppe ${user.priceGroup}`
    : "—";

  // TODO: Pull paymentTerms from B2B user object when API exposes it
  const paymentTermsLabel = PAYMENT_TERMS["net30"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111111]">
          Indstillinger
        </h1>
        <p className="mt-0.5 text-sm text-[#86868B]">
          Kontoplysninger og praeferencer
        </p>
      </div>

      {/* Company info (read-only) */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[#111111]">
            Virksomhedsoplysninger
          </h2>
          <span className="rounded-full border border-[#E5E5EA] px-3 py-1 text-xs text-[#6E6E73]">
            Skrivebeskyttet
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#111111]">
              Firmanavn
            </label>
            <input
              type="text"
              value={user?.companyName ?? "—"}
              disabled
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111]">
              CVR-nummer
            </label>
            <input
              type="text"
              value={user?.cvrNummer ?? "—"}
              disabled
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111]">
              Kontaktperson
            </label>
            <input
              type="text"
              value={user?.contactName ?? "—"}
              disabled
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111]">
              Email
            </label>
            <input
              type="email"
              value={user?.contactEmail ?? "—"}
              disabled
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-[#86868B]">
          For at aendre virksomhedsoplysninger, kontakt{" "}
          <a
            href="mailto:b2b@phonespot.dk"
            className="text-[#1A3D2E] hover:underline"
          >
            b2b@phonespot.dk
          </a>
          .
        </p>
      </div>

      {/* Account terms */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
        <h2 className="mb-5 font-display text-base font-bold text-[#111111]">
          Kontovilkar
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#86868B]">
              Prisgruppe
            </p>
            <p className="mt-1.5 text-sm font-semibold text-[#111111]">
              {priceGroupLabel}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#86868B]">
              Betalingsbetingelser
            </p>
            <p className="mt-1.5 text-sm font-semibold text-[#111111]">
              {paymentTermsLabel}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#86868B]">
              Kontostatus
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  user?.approved ? "bg-green-500" : "bg-amber-400"
                }`}
              />
              <p className="text-sm font-semibold text-[#111111]">
                {user?.approved ? "Godkendt" : "Afventer godkendelse"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#86868B]">
              Konto-ID
            </p>
            <p className="mt-1.5 truncate font-mono text-xs text-[#6E6E73]">
              {user?.id ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
        <h2 className="mb-5 font-display text-base font-bold text-[#111111]">
          Skift adgangskode
        </h2>

        {pwSuccess && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Adgangskoden er aendret.
          </div>
        )}
        {pwError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pwError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="current-pw"
              className="block text-sm font-medium text-[#111111]"
            >
              Nuvaerende adgangskode
            </label>
            <input
              id="current-pw"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={pwForm.currentPassword}
              onChange={handlePwField}
              className={FIELD_CLASS}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-pw"
                className="block text-sm font-medium text-[#111111]"
              >
                Ny adgangskode
              </label>
              <input
                id="new-pw"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={handlePwField}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-pw"
                className="block text-sm font-medium text-[#111111]"
              >
                Bekraeft ny adgangskode
              </label>
              <input
                id="confirm-pw"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={pwForm.confirmPassword}
                onChange={handlePwField}
                className={FIELD_CLASS}
              />
            </div>
          </div>
          <div className="pt-1">
            <button
              type="submit"
              disabled={pwSubmitting}
              className="rounded-full bg-[#1A3D2E] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pwSubmitting ? "Gemmer..." : "Skift adgangskode"}
            </button>
          </div>
        </form>
      </div>

      {/* Notification preferences */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
        <h2 className="mb-5 font-display text-base font-bold text-[#111111]">
          Notifikationer
        </h2>

        <div className="space-y-3">
          {(
            [
              {
                key: "ordrebekraeftelser" as const,
                label: "Ordrebekraeftelser",
                desc: "Email nar vi modtager og bekraefter din ordre",
              },
              {
                key: "forsendelsesnotifikationer" as const,
                label: "Forsendelsesnotifikationer",
                desc: "Email nar din ordre er afsendt med trackingnummer",
              },
              {
                key: "rmaOpdateringer" as const,
                label: "RMA-opdateringer",
                desc: "Email nar der er nyt i dine reklamationssager",
              },
              {
                key: "nyeProdukter" as const,
                label: "Nye produkter",
                desc: "Nyhedsbrev om nye reservedele og tilbud",
              },
            ] as const
          ).map((pref) => (
            <label
              key={pref.key}
              className="flex cursor-pointer items-start gap-4 rounded-xl border border-[#E5E5EA] p-4 transition-colors hover:bg-[#F7F7F8]"
            >
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={notifPrefs[pref.key]}
                  onChange={() => handleNotifToggle(pref.key)}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                    notifPrefs[pref.key]
                      ? "border-[#1A3D2E] bg-[#1A3D2E]"
                      : "border-[#E5E5EA] bg-white"
                  }`}
                >
                  {notifPrefs[pref.key] && (
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                      className="h-3 w-3 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111111]">
                  {pref.label}
                </p>
                <p className="mt-0.5 text-xs text-[#86868B]">{pref.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleNotifSave}
            className="rounded-full bg-[#1A3D2E] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Gem praeferencer
          </button>
          {notifSaved && (
            <span className="text-sm font-medium text-green-600">
              Gemt
            </span>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-[#E5E5EA] bg-white p-6">
        <h2 className="mb-2 font-display text-base font-bold text-[#111111]">
          Support
        </h2>
        <p className="text-sm text-[#86868B]">
          Har du brug for at lukke din konto eller aendre CVR? Kontakt os
          direkte.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="mailto:b2b@phonespot.dk?subject=Kontosupport"
            className="rounded-full border border-[#E5E5EA] px-5 py-2.5 text-sm font-medium text-[#6E6E73] transition-colors hover:border-[#1A3D2E]/30 hover:text-[#111111]"
          >
            Kontakt support
          </a>
          <a
            href="mailto:b2b@phonespot.dk?subject=Luk konto"
            className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Anmod om kontolukning
          </a>
        </div>
      </div>
    </div>
  );
}
