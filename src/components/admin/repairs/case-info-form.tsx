"use client";

import { useState } from "react";
import { Btn, apiError } from "@/components/admin/repairs/ui";

export type InfoField = {
  name: "customer_name" | "customer_phone" | "customer_email" | "device_model" | "serial_number" | "issue_description";
  label: string;
  value: string;
  type?: "text" | "tel" | "email" | "textarea";
  required?: boolean;
  autoComplete?: string;
};

/**
 * Ret kunde- eller enhedsoplysninger på en sag. Kun ændrede felter sendes, så
 * historikken viser præcis hvad der blev rettet.
 */
export function CaseInfoForm({
  ticketId,
  fields,
  customerId,
  onCancel,
  onSaved,
}: {
  ticketId: string;
  fields: InfoField[];
  /** Sat når sagen har et kundekort; så kan rettelsen også gemmes der. */
  customerId?: string | null;
  onCancel: () => void;
  onSaved: (warning: string | null) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.value])),
  );
  const [updateCustomer, setUpdateCustomer] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = fields.filter((f) => values[f.name].trim() !== f.value.trim());
  const touchesCustomer = changed.some((f) => f.name.startsWith("customer_"));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (changed.length === 0) return onCancel();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = Object.fromEntries(changed.map((f) => [f.name, values[f.name]]));
    if (touchesCustomer && customerId) body.update_customer = updateCustomer;
    try {
      const res = await fetch(`/api/repairs/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await apiError(res, "Oplysningerne blev ikke gemt. Prøv igen."));
        setSaving(false);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { warning?: string };
      onSaved(data.warning ?? null);
    } catch {
      setError("Oplysningerne blev ikke gemt, fordi forbindelsen fejlede.");
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm focus:border-[#1A3D2E] focus:outline-none";

  return (
    <form onSubmit={save} className="flex flex-col gap-3" onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      {fields.map((f, i) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm">
          <span className="text-[#5E6A63]">
            {f.label}
            {f.required ? "" : " (valgfri)"}
          </span>
          {f.type === "textarea" ? (
            <textarea
              name={f.name}
              rows={3}
              autoFocus={i === 0}
              value={values[f.name]}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              className={`${inputClass} py-2`}
            />
          ) : (
            <input
              name={f.name}
              type={f.type ?? "text"}
              inputMode={f.type === "tel" ? "tel" : undefined}
              autoComplete={f.autoComplete ?? "off"}
              autoFocus={i === 0}
              required={f.required}
              value={values[f.name]}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              className={`${inputClass} h-10`}
            />
          )}
        </label>
      ))}

      {touchesCustomer && customerId && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={updateCustomer}
            onChange={(e) => setUpdateCustomer(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#1A3D2E]"
          />
          <span>
            Ret også kundekortet
            <span className="block text-[13px] text-[#5E6A63]">
              Så kommer de rigtige oplysninger med på kundens næste sag. Slå fra, hvis det kun gælder denne sag.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-[#B42318]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Btn type="submit" variant="primary" disabled={saving}>
          {saving ? "Gemmer..." : "Gem"}
        </Btn>
        <Btn onClick={onCancel} disabled={saving}>
          Annuller
        </Btn>
      </div>
    </form>
  );
}
