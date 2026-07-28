"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import type { BuybackSettings } from "@/lib/buyback/types";

/**
 * Everything that governs the automation, in one place.
 *
 * The kill switch cannot be flipped on until the sender preflight has passed:
 * a suppressed sender drops offers silently, which is the one failure this whole
 * system is built to prevent.
 */

interface PreflightResult {
  ok: boolean;
  from: string;
  to: string;
  id?: string | null;
  error?: string;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-charcoal">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-charcoal/35">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-stone-400 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10";

export default function BuybackSettingsPage() {
  const [settings, setSettings] = useState<BuybackSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflighting, setPreflighting] = useState(false);

  const load = useCallback(async () => {
    const res = await staffFetch("/api/admin/buyback/settings");
    if (res.ok) setSettings(await res.json());
    else setError("Kunne ikke hente indstillinger");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function patch(changes: Partial<BuybackSettings> & Record<string, unknown>) {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await staffFetch("/api/admin/buyback/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Kunne ikke gemme");
      } else {
        setSettings(await res.json());
        setSaved(true);
      }
    } catch {
      setError("Kunne ikke gemme — prøv igen");
    }
    setSaving(false);
  }

  async function runPreflight() {
    setPreflighting(true);
    setPreflight(null);
    try {
      const res = await staffFetch("/api/admin/buyback/preflight", { method: "POST" });
      const data = await res.json();
      setPreflight(res.ok ? data : { ok: false, from: "", to: "", error: data.error });
    } catch {
      setPreflight({ ok: false, from: "", to: "", error: "Kunne ikke sende testmail" });
    }
    setPreflighting(false);
  }

  if (!settings) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
      </div>
    );
  }

  const kr = (ore: number) => Math.round(ore / 100);
  const pct = (frac: number) => Math.round(frac * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal">
            Opkøb — indstillinger
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">Styrer hvad systemet må gøre selv</p>
        </div>
        <Link href="/admin/opkoeb" className="text-[13px] text-charcoal/40 underline">
          Tilbage
        </Link>
      </div>

      {settings.pausedReason && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-[13px] font-semibold text-rose-800">Automatikken er på pause</p>
          <p className="mt-0.5 text-[12px] text-rose-700/80">{settings.pausedReason}</p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void patch({ pausedReason: null })}
            className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            Genstart automatik
          </button>
        </div>
      )}

      {/* Kill switch */}
      <section className="mb-5 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-charcoal">Automatisk budgivning</h3>
            <p className="mt-1 text-[13px] text-charcoal/50">
              {settings.autoSendEnabled
                ? "Bud sendes automatisk inden for sikkerhedsrammen."
                : "Alt går til manuel behandling."}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void patch({ autoSendEnabled: !settings.autoSendEnabled })}
            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              settings.autoSendEnabled
                ? "bg-emerald-600 text-white"
                : "border border-stone-300 text-stone-600"
            }`}
          >
            {settings.autoSendEnabled ? "Slået til" : "Slået fra"}
          </button>
        </div>

        {!settings.autoSendEnabled && (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-medium text-amber-900">Verificér afsender først</p>
            <p className="mt-1 text-[12px] leading-relaxed text-amber-800/80">
              info@ og ordre@ har været suppresset i Resend før. En suppresset afsender
              taber mails i stilhed — buddene ville se sendt ud hos os og aldrig nå frem.
            </p>
            <button
              type="button"
              disabled={preflighting}
              onClick={() => void runPreflight()}
              className="mt-3 rounded-full border border-amber-400 bg-white px-4 py-2 text-[13px] font-semibold text-amber-800 disabled:opacity-50"
            >
              {preflighting ? "Sender..." : "Send testmail"}
            </button>
            {preflight && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-[12px] ${
                  preflight.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                }`}
              >
                {preflight.ok ? (
                  <>
                    Testmail afsendt fra {preflight.from} til {preflight.to}. Kom den frem i
                    indbakken, kan automatikken slås til.
                  </>
                ) : (
                  <>Resend svarede: {preflight.error}</>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Envelope */}
      <section className="mb-5 space-y-4 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-charcoal">Sikkerhedsramme</h3>

        <Field label="Beløbsloft (kr)" hint="Bud over dette beløb sendes aldrig automatisk.">
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={kr(settings.autoSendMaxOre)}
            onBlur={(e) => void patch({ autoSendMaxOre: Math.round(Number(e.target.value) * 100) })}
            className={inputClass}
          />
        </Field>

        <Field
          label="Hold-vindue (minutter)"
          hint="Tiden du har til at tage over, før buddet sendes. 0 sender straks."
        >
          <input
            type="number"
            min={0}
            max={4320}
            defaultValue={settings.holdMinutes}
            onBlur={(e) => void patch({ holdMinutes: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Målmargin (%)" hint="Marginen buddet sigter efter.">
            <input
              type="number"
              min={0}
              max={90}
              defaultValue={pct(settings.targetMarginPct)}
              onBlur={(e) => void patch({ targetMarginPct: Number(e.target.value) / 100 })}
              className={inputClass}
            />
          </Field>
          <Field label="Gulvmargin (%)" hint="Din grænse under forhandling.">
            <input
              type="number"
              min={0}
              max={90}
              defaultValue={pct(settings.floorMarginPct)}
              onBlur={(e) => void patch({ floorMarginPct: Number(e.target.value) / 100 })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Mindste margin i kroner" hint="Gælder på billige modeller, hvor procenter bliver for små.">
          <input
            type="number"
            min={0}
            step={50}
            defaultValue={kr(settings.floorMarginMinOre)}
            onBlur={(e) => void patch({ floorMarginMinOre: Math.round(Number(e.target.value) * 100) })}
            className={inputClass}
          />
        </Field>
      </section>

      {/* Notifications */}
      <section className="mb-5 space-y-4 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-charcoal">Beskeder</h3>

        <Field label="SMS-modtager" hint="Kun kritiske hændelser: pause, bounce, accept over tærsklen.">
          <input
            type="tel"
            placeholder="+45..."
            defaultValue={settings.smsRecipient}
            onBlur={(e) => void patch({ smsRecipient: e.target.value.trim() })}
            className={inputClass}
          />
        </Field>

        <Field label="SMS ved accept over (kr)" hint="Penge på vej ud — værd at vide med det samme.">
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={kr(settings.smsAcceptThresholdOre)}
            onBlur={(e) =>
              void patch({ smsAcceptThresholdOre: Math.round(Number(e.target.value) * 100) })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Modtager af morgenmail" hint="Den daglige arbejdsseddel kl. 07 — og testmailen.">
          <input
            type="email"
            placeholder="dig@phonespot.dk"
            defaultValue={settings.digestRecipient}
            onBlur={(e) => void patch({ digestRecipient: e.target.value.trim() })}
            className={inputClass}
          />
        </Field>

        <Field label="Afsender" hint="Skal være verificeret i Resend og ikke suppresset.">
          <input
            type="text"
            defaultValue={settings.fromAddress}
            onBlur={(e) => void patch({ fromAddress: e.target.value.trim() })}
            className={inputClass}
          />
        </Field>
      </section>

      <div className="flex items-center gap-3 pb-10">
        {saving && <span className="text-[13px] text-charcoal/40">Gemmer...</span>}
        {saved && !saving && <span className="text-[13px] text-emerald-600">Gemt</span>}
        {error && <span className="text-[13px] text-rose-600">{error}</span>}
        <Link href="/admin/opkoeb/priser" className="ml-auto text-[13px] text-charcoal/40 underline">
          Basispriser
        </Link>
      </div>
    </div>
  );
}
