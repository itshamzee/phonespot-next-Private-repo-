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

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "sms",
    label: "SMS",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    key: "email",
    label: "Mail",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    key: "quick_reply",
    label: "Quick Replies",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    key: "api_status",
    label: "API Status",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
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
    if (!confirm("Er du sikker p\u00e5 du vil slette denne template?")) return;
    try {
      await fetch(`/api/admin/templates?id=${id}`, { method: "DELETE" });
      fetchTemplates(activeTab);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Indstillinger
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          Templates, quick replies og API-status
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* API Status Tab */}
      {activeTab === "api_status" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {loadingStatus ? (
            <div className="col-span-3 flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
                <p className="text-sm text-charcoal/30">Indl\u00e6ser status...</p>
              </div>
            </div>
          ) : apiStatus ? (
            <>
              <StatusCard label="GatewayAPI" description="SMS-udbyder" ok={apiStatus.gatewayApi} />
              <StatusCard label="Resend" description="Email-udbyder" ok={apiStatus.resend} />
              <StatusCard label="Supabase" description="Database" ok={apiStatus.supabase} />
            </>
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
              <p className="text-sm font-medium text-charcoal/30">Kunne ikke hente status</p>
            </div>
          )}
        </div>
      )}

      {/* Template Tabs */}
      {activeTab !== "api_status" && (
        <>
          {/* Add button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tilf\u00f8j template
            </button>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
                <p className="text-sm text-charcoal/30">Indl\u00e6ser templates...</p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
                <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-charcoal/30">Ingen templates fundet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-black/[0.04] bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-charcoal">{t.name}</p>
                      {!t.active && (
                        <span className="rounded-full bg-charcoal/[0.06] px-2 py-0.5 text-[10px] font-bold text-charcoal/30">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    {t.subject && (
                      <p className="mt-0.5 text-xs text-charcoal/35">
                        Emne: {t.subject}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-charcoal/40">
                      {t.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(t)}
                      className="rounded-lg border border-black/[0.06] px-3 py-1.5 text-xs font-semibold text-charcoal/50 transition-colors hover:border-charcoal/20 hover:text-charcoal"
                    >
                      Rediger
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50"
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-black/[0.04] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-charcoal">
                {editingTemplate ? "Rediger template" : "Ny template"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-charcoal/30 transition-colors hover:bg-charcoal/[0.04] hover:text-charcoal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-charcoal/50">Navn</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  placeholder="Template navn"
                />
              </div>

              {/* Subject (email only) */}
              {activeTab === "email" && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-charcoal/50">Emne</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    placeholder="Email emne"
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-charcoal/50">Indhold</label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  placeholder="Skriv template indhold her..."
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {VARIABLE_HINTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormBody((prev) => prev + v)}
                      className="rounded-md bg-charcoal/[0.04] px-2 py-0.5 text-[11px] font-semibold text-charcoal/40 transition-colors hover:bg-charcoal/[0.08] hover:text-charcoal/60"
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
                    formActive ? "bg-emerald-500" : "bg-charcoal/20"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      formActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-[13px] font-semibold text-charcoal/50">
                  {formActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-black/[0.06] px-4 py-2.5 text-sm font-semibold text-charcoal/50 transition-colors hover:border-charcoal/20 hover:text-charcoal"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formBody.trim()}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/15 transition-all hover:brightness-110 disabled:opacity-50"
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
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            ok ? "bg-emerald-500/10" : "bg-rose-500/10"
          }`}
        >
          <div
            className={`h-3 w-3 rounded-full ${
              ok ? "bg-emerald-500 shadow-sm shadow-emerald-500/40" : "bg-rose-500 shadow-sm shadow-rose-500/40"
            }`}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">{label}</p>
          <p className="text-xs text-charcoal/35">{description}</p>
        </div>
      </div>
      <p
        className={`mt-3 text-xs font-bold ${
          ok ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {ok ? "Konfigureret" : "Ikke konfigureret"}
      </p>
    </div>
  );
}
