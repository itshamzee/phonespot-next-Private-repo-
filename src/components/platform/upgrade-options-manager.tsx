"use client";

import { useState } from "react";
import { formatOere } from "@/lib/cart/utils";

/* ── Types ────────────────────────────────────────────────────────── */
interface UpgradeOption {
  id: string;
  kind: "ram" | "ssd";
  label: string;
  target_spec: string;
  price: number; // øre
  active: boolean;
  sort_order: number;
  created_at?: string;
}

interface Template {
  id: string;
  display_name: string;
  brand?: string | null;
  model?: string | null;
}

interface Link {
  template_id: string;
  upgrade_option_id: string;
}

interface UpgradeOptionsManagerProps {
  initialOptions: UpgradeOption[];
  templates: Template[];
  initialLinks: Link[];
}

const inputCls =
  "rounded-xl border border-sand bg-cream px-3 py-2 text-sm text-charcoal focus:border-green-eco/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10";

const KIND_LABEL: Record<UpgradeOption["kind"], string> = { ram: "RAM", ssd: "SSD" };

function linkKey(templateId: string, optionId: string) {
  return `${templateId}::${optionId}`;
}

/* ════════════════════════════════════════════════════════════════════ */
export function UpgradeOptionsManager({ initialOptions, templates, initialLinks }: UpgradeOptionsManagerProps) {
  const [options, setOptions] = useState<UpgradeOption[]>(initialOptions);
  const [links, setLinks] = useState<Set<string>>(
    new Set(initialLinks.map((l) => linkKey(l.template_id, l.upgrade_option_id))),
  );
  const [error, setError] = useState<string | null>(null);

  /* New-option form */
  const [newKind, setNewKind] = useState<UpgradeOption["kind"]>("ram");
  const [newLabel, setNewLabel] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newPriceKr, setNewPriceKr] = useState("");
  const [creating, setCreating] = useState(false);

  async function patchOption(id: string, patch: Partial<UpgradeOption>) {
    setError(null);
    const prev = options;
    setOptions((cur) => cur.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    try {
      const res = await fetch(`/api/platform/upgrade-options/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Kunne ikke opdatere opgraderingen");
      }
    } catch (e) {
      setOptions(prev);
      setError(e instanceof Error ? e.message : "Kunne ikke opdatere opgraderingen");
    }
  }

  async function deleteOption(id: string) {
    if (!window.confirm("Slet denne opgradering? Den fjernes samtidig fra alle modeller.")) return;
    setError(null);
    const prev = options;
    setOptions((cur) => cur.filter((o) => o.id !== id));
    try {
      const res = await fetch(`/api/platform/upgrade-options/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kunne ikke slette opgraderingen");
      setLinks((cur) => {
        const next = new Set(cur);
        for (const key of next) if (key.endsWith(`::${id}`)) next.delete(key);
        return next;
      });
    } catch (e) {
      setOptions(prev);
      setError(e instanceof Error ? e.message : "Kunne ikke slette opgraderingen");
    }
  }

  async function createOption() {
    setError(null);
    const priceOere = Math.round(parseFloat(newPriceKr.replace(",", ".")) * 100);
    if (!newLabel.trim() || !Number.isFinite(priceOere) || priceOere <= 0) {
      setError("Udfyld label og en gyldig pris (kr) før du tilføjer en opgradering");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/platform/upgrade-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: newKind,
          label: newLabel.trim(),
          target_spec: newTarget.trim(),
          price: priceOere,
          sort_order: options.filter((o) => o.kind === newKind).length,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Kunne ikke oprette opgraderingen");
      setOptions((cur) => [...cur, body as UpgradeOption]);
      setNewLabel("");
      setNewTarget("");
      setNewPriceKr("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke oprette opgraderingen");
    } finally {
      setCreating(false);
    }
  }

  async function toggleLink(templateId: string, optionId: string, enabled: boolean) {
    setError(null);
    const key = linkKey(templateId, optionId);
    setLinks((cur) => {
      const next = new Set(cur);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
    try {
      const res = await fetch("/api/platform/upgrade-options/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, upgrade_option_id: optionId, enabled }),
      });
      if (!res.ok) throw new Error("Kunne ikke opdatere modelkoblingen");
    } catch (e) {
      setLinks((cur) => {
        const next = new Set(cur);
        if (enabled) next.delete(key);
        else next.add(key);
        return next;
      });
      setError(e instanceof Error ? e.message : "Kunne ikke opdatere modelkoblingen");
    }
  }

  const activeOptions = options.filter((o) => o.active).sort((a, b) => a.kind.localeCompare(b.kind) || a.sort_order - b.sort_order);
  const sortedOptions = [...options].sort((a, b) => a.kind.localeCompare(b.kind) || a.sort_order - b.sort_order);

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      )}

      {/* ── Prisliste ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-sand bg-white shadow-sm">
        <div className="border-b border-sand/50 bg-cream/60 px-5 py-3">
          <h3 className="font-display text-base font-bold text-charcoal">Prisliste</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand/50 bg-cream/40 text-left text-[11px] font-semibold uppercase tracking-wider text-gray">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Pris (kr)</th>
                <th className="px-4 py-3">Aktiv</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/50">
              {sortedOptions.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 align-middle text-charcoal-light">{KIND_LABEL[o.kind]}</td>
                  <td className="px-4 py-2 align-middle">
                    <input
                      defaultValue={o.label}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== o.label) {
                          patchOption(o.id, { label: e.target.value.trim() });
                        }
                      }}
                      className={inputCls + " w-full min-w-[220px]"}
                    />
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <input
                      defaultValue={o.target_spec}
                      onBlur={(e) => {
                        if (e.target.value !== o.target_spec) {
                          patchOption(o.id, { target_spec: e.target.value.trim() });
                        }
                      }}
                      className={inputCls + " w-28"}
                    />
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(o.price / 100).toFixed(2)}
                      onBlur={(e) => {
                        const oere = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100);
                        if (Number.isFinite(oere) && oere > 0 && oere !== o.price) {
                          patchOption(o.id, { price: oere });
                        }
                      }}
                      className={inputCls + " w-28"}
                    />
                    <span className="ml-2 text-xs text-gray">= {formatOere(o.price)}</span>
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <input
                      type="checkbox"
                      checked={o.active}
                      onChange={(e) => patchOption(o.id, { active: e.target.checked })}
                      className="h-4 w-4 cursor-pointer rounded border-sand accent-green-eco"
                      aria-label={`${o.label} aktiv`}
                    />
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <button
                      onClick={() => deleteOption(o.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Slet
                    </button>
                  </td>
                </tr>
              ))}

              {/* Tilføj opgradering */}
              <tr className="bg-cream/30">
                <td className="px-4 py-2 align-middle">
                  <select
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value as UpgradeOption["kind"])}
                    className={inputCls}
                  >
                    <option value="ram">RAM</option>
                    <option value="ssd">SSD</option>
                  </select>
                </td>
                <td className="px-4 py-2 align-middle">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Fx Opgrader til 32 GB RAM (inkl. montering)"
                    className={inputCls + " w-full min-w-[220px]"}
                  />
                </td>
                <td className="px-4 py-2 align-middle">
                  <input
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="32GB"
                    className={inputCls + " w-28"}
                  />
                </td>
                <td className="px-4 py-2 align-middle">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPriceKr}
                    onChange={(e) => setNewPriceKr(e.target.value)}
                    placeholder="599"
                    className={inputCls + " w-28"}
                  />
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 align-middle">
                  <button
                    onClick={createOption}
                    disabled={creating}
                    className="rounded-xl bg-green-eco px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-light disabled:opacity-50"
                  >
                    {creating ? "Tilføjer…" : "Tilføj"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Model-matrix ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-sand bg-white shadow-sm">
        <div className="border-b border-sand/50 bg-cream/60 px-5 py-3">
          <h3 className="font-display text-base font-bold text-charcoal">Modeller</h3>
          <p className="mt-0.5 text-xs text-charcoal/50">
            Nye modeller starter uden tilvalg — slå kun opgradering til på modeller, der fysisk kan opgraderes (ikke fastloddet RAM).
          </p>
        </div>
        {activeOptions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray">Opret mindst én aktiv opgradering for at se model-matrixen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/50 bg-cream/40 text-left text-[11px] font-semibold uppercase tracking-wider text-gray">
                  <th className="sticky left-0 bg-cream/40 px-4 py-3">Model</th>
                  {activeOptions.map((o) => (
                    <th key={o.id} className="px-4 py-3 text-center">
                      {o.target_spec || o.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="sticky left-0 bg-white px-4 py-2 align-middle font-medium text-charcoal">{t.display_name}</td>
                    {activeOptions.map((o) => (
                      <td key={o.id} className="px-4 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={links.has(linkKey(t.id, o.id))}
                          onChange={(e) => toggleLink(t.id, o.id, e.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-sand accent-green-eco"
                          aria-label={`${o.label} på ${t.display_name}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
