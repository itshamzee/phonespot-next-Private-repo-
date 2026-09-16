"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABELS, type MailAgentSettings, type MailCategory } from "@/lib/mail-agent/types";

interface Status {
  mailboxes: string[];
  configured: boolean;
  lastRun: {
    started_at: string;
    finished_at: string | null;
    fetched: number;
    processed: number;
    drafted: number;
    auto_sent: number;
    errors: unknown[];
  } | null;
  pending: number;
  needsHuman: number;
}

/** Categories that may ever be switched to auto-send. Complaints and suppliers are never candidates. */
const AUTO_CANDIDATES: MailCategory[] = ["butik_aabningstider", "ordre", "produkt", "reparation", "opkoeb", "andet"];

function relative(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "lige nu";
  if (mins < 60) return `${mins} min siden`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} timer siden` : `${Math.round(h / 24)} dage siden`;
}

/** One-line status of the mail assistant plus the auto-send switches. */
export default function MailAgentPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [settings, setSettings] = useState<MailAgentSettings | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/mail-agent/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStatus(s))
      .catch(() => {});
    fetch("/api/admin/mail-agent/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSettings(s))
      .catch(() => {});
  }, []);

  async function toggle(cat: MailCategory) {
    if (!settings) return;
    const next = settings.autoSendCategories.includes(cat)
      ? settings.autoSendCategories.filter((c) => c !== cat)
      : [...settings.autoSendCategories, cat];
    const res = await fetch("/api/admin/mail-agent/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoSendCategories: next }),
    });
    if (res.ok) setSettings(await res.json());
  }

  if (!status) return null;

  const run = status.lastRun;
  const errorCount = run && Array.isArray(run.errors) ? run.errors.length : 0;

  return (
    <div className="mb-6 rounded-2xl border border-black/[0.04] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal/50">
        <span className="font-semibold text-charcoal/70">Mailassistent</span>
        {!status.configured && <span className="font-semibold text-red-600">API-nøgle mangler</span>}
        {status.mailboxes.length === 0 && (
          <span className="font-semibold text-red-600">Ingen postkasser konfigureret</span>
        )}
        {run ? (
          <span>
            Sidst kørt {relative(run.started_at)}: {run.fetched} hentet, {run.drafted} forslag
            {run.auto_sent ? `, ${run.auto_sent} sendt automatisk` : ""}
            {errorCount ? `, ${errorCount} fejl` : ""}
          </span>
        ) : (
          <span>Ikke kørt endnu</span>
        )}
        <span>
          {status.pending} forslag venter{status.needsHuman ? `, ${status.needsHuman} kræver dig` : ""}
        </span>
        {status.mailboxes.length > 0 && (
          <span className="hidden sm:inline">{status.mailboxes.join(", ")}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto font-semibold text-charcoal/50 transition-colors hover:text-charcoal/80"
        >
          {open ? "Skjul automatiske svar" : "Automatiske svar"}
        </button>
      </div>

      {open && settings && (
        <div className="mt-3 border-t border-black/[0.04] pt-3">
          <p className="mb-2 text-xs text-charcoal/45">
            Kategorier der sendes uden godkendelse, når assistenten er sikker og intet kræver dig.
            Tomt betyder at alt venter på dig.
          </p>
          <div className="flex flex-wrap gap-2">
            {AUTO_CANDIDATES.map((cat) => {
              const on = settings.autoSendCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle(cat)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    on
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "border border-black/[0.06] bg-white text-charcoal/40 hover:text-charcoal/60"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
