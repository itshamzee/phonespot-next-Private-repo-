"use client";

import { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  channel: "sms" | "email" | "quick_reply";
  name: string;
  subject: string | null;
  body: string;
  variables: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
}

interface ApiStatus {
  gatewayApi: boolean;
  resend: boolean;
  supabase: boolean;
}

type Tab = "sms" | "email" | "quick_reply" | "api_status";

const TABS: { key: Tab; label: string }[] = [
  { key: "sms", label: "SMS Templates" },
  { key: "email", label: "Mail Templates" },
  { key: "quick_reply", label: "Quick Replies" },
  { key: "api_status", label: "API Status" },
];

const VARIABLE_HINTS = [
  "{kundenavn}",
  "{enhed}",
  "{status}",
  "{tracking_link}",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminIndstillingerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sms");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------- Fetch templates ---------- */
  const fetchTemplates = useCallback(async (channel: string) => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`/api/admin/templates?channel=${channel}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? data ?? []);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    }
    setLoadingTemplates(false);
  }, []);

  /* ---------- Fetch API status ---------- */
  const fetchApiStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/status");
      if (res.ok) {
        setApiStatus(await res.json());
      }
    } catch {
      // ignore
    }
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    if (activeTab === "api_status") {
      fetchApiStatus();
    } else {
      fetchTemplates(activeTab);
    }
  }, [activeTab, fetchTemplates, fetchApiStatus]);

  /* ---------- Modal helpers ---------- */
  function openCreateModal() {
    setEditingTemplate(null);
    setFormName("");
    setFormSubject("");
    setFormBody("");
    setFormActive(true);
    setModalOpen(true);
  }

  function openEditModal(t: Template) {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormSubject(t.subject ?? "");
    setFormBody(t.body);
    setFormActive(t.active);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      channel: activeTab,
      name: formName,
      subject: activeTab === "email" ? formSubject : null,
      body: formBody,
      active: formActive,
      id: editingTemplate?.id ?? undefined,
    };

    try {
      await fetch("/api/admin/templates", {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setModalOpen(false);
      fetchTemplates(activeTab);
    } catch {
      // ignore
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Er du sikker paa du vil slette denne template?")) return;
    try {
      await fetch(`/api/admin/templates?id=${id}`, { method: "DELETE" });
      fetchTemplates(activeTab);
    } catch {
      // ignore
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-charcoal">
        Indstillinger
      </h2>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-stone-200/60 bg-stone-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-charcoal shadow-sm"
                : "text-stone-400 hover:text-charcoal"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- API Status Tab ---- */}
      {activeTab === "api_status" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {loadingStatus ? (
            <p className="text-stone-400">Indlaeser status...</p>
          ) : apiStatus ? (
            <>
              <StatusCard
                label="GatewayAPI"
                description="SMS-udbyder"
                ok={apiStatus.gatewayApi}
              />
              <StatusCard
                label="Resend"
                description="Email-udbyder"
                ok={apiStatus.resend}
              />
              <StatusCard
                label="Supabase"
                description="Database"
                ok={apiStatus.supabase}
              />
            </>
          ) : (
            <p className="text-stone-400">Kunne ikke hente status.</p>
          )}
        </div>
      )}

      {/* ---- Template Tabs ---- */}
      {activeTab !== "api_status" && (
        <>
          {/* Add button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-green-eco px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-green-eco/20 transition-all hover:brightness-110"
            >
              + Tilfoej template
            </button>
          </div>

          {loadingTemplates ? (
            <p className="text-stone-400">Indlaeser templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-stone-400">Ingen templates fundet.</p>
          ) : (
            <div className="grid gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-charcoal">{t.name}</p>
                      {!t.active && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-400">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    {t.subject && (
                      <p className="mt-0.5 text-xs text-stone-400">
                        Emne: {t.subject}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                      {t.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(t)}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-charcoal"
                    >
                      Rediger
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50"
                    >
                      Slet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---- Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/30 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200/60 bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
              {editingTemplate ? "Rediger template" : "Ny template"}
            </h3>

            <div className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-[13px] font-medium text-stone-400">
                  Navn
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                  placeholder="Template navn"
                />
              </div>

              {/* Subject (email only) */}
              {activeTab === "email" && (
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-stone-400">
                    Emne
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                    placeholder="Email emne"
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="mb-1 block text-[13px] font-medium text-stone-400">
                  Indhold
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                  placeholder="Skriv template indhold her..."
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VARIABLE_HINTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormBody((prev) => prev + v)}
                      className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 transition-colors hover:bg-stone-200 hover:text-charcoal"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    formActive ? "bg-green-eco" : "bg-stone-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      formActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-[13px] font-medium text-stone-500">
                  {formActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-charcoal"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formBody.trim()}
                className="rounded-xl bg-green-eco px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-green-eco/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Gemmer..." : "Gem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Card                                                        */
/* ------------------------------------------------------------------ */

function StatusCard({
  label,
  description,
  ok,
}: {
  label: string;
  description: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            ok ? "bg-emerald-500 shadow-sm shadow-emerald-500/40" : "bg-rose-500 shadow-sm shadow-rose-500/40"
          }`}
        />
        <div>
          <p className="font-semibold text-charcoal">{label}</p>
          <p className="text-[13px] text-stone-400">{description}</p>
        </div>
      </div>
      <p
        className={`mt-2 text-xs font-medium ${
          ok ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {ok ? "Konfigureret" : "Ikke konfigureret"}
      </p>
    </div>
  );
}
